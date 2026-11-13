import pg from "pg";

// A standard Postgres client (node-postgres) that works with Amazon RDS,
// Neon, or a local Postgres. It keeps the same `sql` interface the Neon
// driver had, so the queries across the codebase did not need to change:
//
//   const rows = await sql`SELECT * FROM users WHERE user_id = ${id}`;
//   const rows = await sql.query("SELECT ... WHERE id = $1", [id]);
//   const [a, b] = await sql.transaction([sql`...`, sql`...`]);
//   const client = await pool.connect(); // multi-step transactions

export type Row = Record<string, any>;

// Build pool settings from DATABASE_URL. The sslmode / channel_binding
// parameters are removed from the URL and SSL is set here instead, because
// node-postgres reads sslmode=require as "verify the certificate", which
// fails against RDS without the AWS certificate bundle.
function poolConfig(databaseUrl: string): pg.PoolConfig {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const useSsl = sslmode ? sslmode !== "disable" : !isLocal;

  return {
    connectionString: url.toString(),
    // Encrypted connection. The server certificate is not verified.
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10,
  };
}

// A query that runs only when awaited, so it can also be handed to
// sql.transaction() to run inside one transaction (same as the Neon driver).
export class SqlQuery implements PromiseLike<Row[]> {
  constructor(
    private readonly pool: pg.Pool,
    readonly text: string,
    readonly values: unknown[] = [],
  ) {}

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((rows: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.pool
      .query(this.text, this.values.length ? this.values : undefined)
      .then((result) => result.rows as Row[])
      .then(onfulfilled, onrejected);
  }
}

export function createDatabase(databaseUrl: string) {
  const pool = new pg.Pool(poolConfig(databaseUrl));

  // An idle connection dropped by the server (restart, network blip) must
  // not crash the app; the pool opens a new one on the next query.
  pool.on("error", (error) => {
    console.error("[db] idle client error:", error.message);
  });

  const tagged = (parts: TemplateStringsArray, ...values: unknown[]) => {
    const text = parts.reduce(
      (result, part, index) => result + (index ? `$${index}` : "") + part,
    );
    return new SqlQuery(pool, text, values);
  };

  const sql = Object.assign(tagged, {
    query: (text: string, values: unknown[] = []) =>
      new SqlQuery(pool, text, values),

    // Runs every query in one transaction and returns each query's rows.
    async transaction(queries: SqlQuery[]): Promise<Row[][]> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results: Row[][] = [];
        for (const q of queries) {
          const result = await client.query(
            q.text,
            q.values.length ? q.values : undefined,
          );
          results.push(result.rows);
        }
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  });

  return { sql, pool };
}
