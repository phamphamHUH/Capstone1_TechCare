import { neon, Pool } from "@neondatabase/serverless";
import { ENV } from "./env.js";

if (!ENV.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const sql = neon(ENV.DATABASE_URL);
export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});

// =======================================================================
// TABLE DEFINITIONS
// SINGLE SOURCE OF TRUTH
// =======================================================================

type TableDefinition = {
  table: string;
  columns: Record<string, string>;
};

const TABLES: TableDefinition[] = [
  {
    table: "users",
    columns: {
      id: "SERIAL PRIMARY KEY",
      user_id: "VARCHAR(255) UNIQUE NOT NULL",
      username: "VARCHAR(255) NOT NULL",
      password_hash: "VARCHAR(255) NOT NULL",
      first_name: "VARCHAR(255) NOT NULL",
      middle_name: "VARCHAR(255)",
      last_name: "VARCHAR(255) NOT NULL",
      suffix: "VARCHAR(20)",
      sex: "VARCHAR(20) NOT NULL",
      email: "VARCHAR(255) NOT NULL UNIQUE",
      contact_number: "VARCHAR(20) NOT NULL",
      emergency_contact_name: "VARCHAR(255)",
      emergency_contact: "VARCHAR(20)",
      address: "TEXT NOT NULL",
      birthdate: "DATE NOT NULL",
      role: "VARCHAR(50) NOT NULL",
      department: "VARCHAR(100)",
      employment_status: "VARCHAR(50)",
      date_hired: "DATE NOT NULL",
      shift_start: "TIME NOT NULL DEFAULT '08:00:00'",
      shift_end: "TIME NOT NULL DEFAULT '17:00:00'",
      last_login: "TIMESTAMP",
      account_status: "BOOLEAN NOT NULL DEFAULT TRUE",
      profile_photo: "TEXT",
      active: "BOOLEAN NOT NULL DEFAULT FALSE",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      // Doctor-specific fields
      prc_license_number: "VARCHAR(50)",
      ptr_number: "VARCHAR(50)",
      s2_license: "VARCHAR(50)",
      medical_specialty: "VARCHAR(100)",
      subspecialty: "VARCHAR(100)",
      board_certification: "VARCHAR(100)",
    },
  },

  {
    table: "patients",
    columns: {
      id: "SERIAL PRIMARY KEY",
      image_url: "TEXT",
      patient_id: "VARCHAR(255) UNIQUE NOT NULL",
      username: "VARCHAR(255) NOT NULL",
      password_hash: "VARCHAR(255) NOT NULL",
      first_name: "VARCHAR(255) NOT NULL",
      middle_name: "VARCHAR(255)",
      last_name: "VARCHAR(255) NOT NULL",
      suffix: "VARCHAR(20)",
      sex: "VARCHAR(20) NOT NULL",
      is_pwd: "BOOLEAN NOT NULL DEFAULT FALSE",
      email: "VARCHAR(255) NOT NULL UNIQUE",
      contact_number: "VARCHAR(20) NOT NULL",
      guardian_name: "VARCHAR(255)",
      guardian_relationship: "VARCHAR(255)",
      guardian_contact: "VARCHAR(20)",
      street: "TEXT NOT NULL",
      barangay: "TEXT NOT NULL",
      city: "TEXT NOT NULL",
      province: "TEXT NOT NULL",
      zip_code: "TEXT NOT NULL",
      birthdate: "DATE NOT NULL",
      height_cm: "DECIMAL(10,2)",
      weight_kg: "DECIMAL(10,2)",
      allergies: "TEXT",
      existing_conditions: "TEXT",
      current_medications: "TEXT",
      previous_surgeries: "TEXT",
      previous_hospitalizations: "TEXT",
      family_medical_history: "TEXT",
      smoking_status: "VARCHAR(50)",
      alcohol_consumption: "VARCHAR(50)",
      role: "VARCHAR(50) NOT NULL DEFAULT 'patient'",
      department: "VARCHAR(100)",
      employment_status: "VARCHAR(50)",
      date_hired: "DATE",
      shift_start: "TIME NOT NULL DEFAULT '08:00:00'",
      shift_end: "TIME NOT NULL DEFAULT '17:00:00'",
      last_login: "TIMESTAMP",
      account_status: "BOOLEAN NOT NULL DEFAULT TRUE",
      profile_photo: "TEXT",
      active: "BOOLEAN NOT NULL DEFAULT FALSE",
      civil_status: "VARCHAR(50) NOT NULL DEFAULT 'Single'",
      blood_type: "VARCHAR(50)",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "services",
    columns: {
      id: "SERIAL PRIMARY KEY",
      service_id: "VARCHAR(255) UNIQUE NOT NULL",
      service_type: "VARCHAR(50) NOT NULL",
      service_name: "VARCHAR(255) NOT NULL UNIQUE",
      price: "DECIMAL(10,2) NOT NULL",
      active: "BOOLEAN NOT NULL DEFAULT TRUE",
      room: "VARCHAR(255) NOT NULL",
      service_category: "VARCHAR(255) NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "packages",
    columns: {
      id: "SERIAL PRIMARY KEY",
      package_id: "VARCHAR(255) UNIQUE NOT NULL",
      package_name: "VARCHAR(255) NOT NULL",
      package_price: "NUMERIC(10,2) NOT NULL",
      active: "BOOLEAN NOT NULL DEFAULT TRUE",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "package_services",
    columns: {
      id: "SERIAL PRIMARY KEY",
      package_id: "VARCHAR(255) NOT NULL REFERENCES packages(package_id)",
      service_id: "VARCHAR(255) NOT NULL REFERENCES services(service_id)",
    },
  },

  {
    table: "queue_entries",
    columns: {
      id: "SERIAL PRIMARY KEY",
      queue_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      queue_number: "INTEGER NOT NULL",
      is_priority: "BOOLEAN NOT NULL DEFAULT FALSE",
      skip_count: "INTEGER NOT NULL DEFAULT 0",
      status: "VARCHAR(20) NOT NULL DEFAULT 'waiting'",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "bills",
    columns: {
      id: "SERIAL PRIMARY KEY",
      bill_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      items: "JSONB",
      status: "VARCHAR(20) NOT NULL DEFAULT 'Pending'",
      invoice_id: "VARCHAR(50)",
      invoice_issued_at: "TIMESTAMP",
      billed_at: "TIMESTAMP",
      subtotal: "NUMERIC(12,2) NOT NULL DEFAULT 0",
      discount_type: "VARCHAR(50)",
      discount_rate: "NUMERIC(5,2)",
      discount_amount: "NUMERIC(12,2) NOT NULL DEFAULT 0",
      discount_id_no: "VARCHAR(100)",
      total_amount: "NUMERIC(12,2) NOT NULL DEFAULT 0",
      payment_method: "VARCHAR(30) NOT NULL DEFAULT 'Cash'",
      paid_at: "TIMESTAMP",
      reference_num: "VARCHAR(50)",
      received_by: "VARCHAR(255) REFERENCES users(user_id)",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "consultation_records",
    columns: {
      id: "SERIAL PRIMARY KEY",
      consultation_record_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      service_id: "VARCHAR(255) NOT NULL REFERENCES services(service_id)",
      queue_id: "VARCHAR(255) REFERENCES queue_entries(queue_id)",
      bill_id: "VARCHAR(255) REFERENCES bills(bill_id)",
      status: "VARCHAR(255) NOT NULL DEFAULT 'Created'",
      cancellation_reason: "VARCHAR(255)",
      is_paid: "BOOLEAN NOT NULL DEFAULT FALSE",
      requested_by: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      consulted_by: "VARCHAR(255) REFERENCES users(user_id)",
      consultation_type: "VARCHAR(255) NOT NULL DEFAULT 'Initial'",
      diagnosis: "JSONB",
      presenting_complaint: "JSONB",
      vital_signs: "JSONB",
      physical_examination: "JSONB",
      notes: "TEXT",
      requested_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      consulted_at: "TIMESTAMP",
    },
  },

  {
    table: "prescription_records",
    columns: {
      id: "SERIAL PRIMARY KEY",
      prescription_id: "VARCHAR(255) UNIQUE NOT NULL",
      consultation_record_id:
        "VARCHAR(255) NOT NULL REFERENCES consultation_records(consultation_record_id)",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      prescriber_id: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      prescribed_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      valid_until: "DATE",
      status: "VARCHAR(20) NOT NULL DEFAULT 'Active'",
      prescription_items: "JSONB NOT NULL",
      notes: "TEXT",
    },
  },

  {
    table: "test_requests",
    columns: {
      id: "SERIAL PRIMARY KEY",
      request_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      // Set when a doctor requests tests from a consultation; NULL for
      // front desk walk-in requests.
      consultation_record_id:
        "VARCHAR(255) REFERENCES consultation_records(consultation_record_id)",
      requested_by: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      status: "VARCHAR(20) NOT NULL DEFAULT 'Requested'",
      is_priority: "BOOLEAN NOT NULL DEFAULT FALSE",
      request_date: "DATE NOT NULL DEFAULT CURRENT_DATE",
      // Optional date the doctor expects the results to be ready.
      estimated_release_date: "DATE",
      requested_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "test_request_items",
    columns: {
      id: "SERIAL PRIMARY KEY",
      item_id: "VARCHAR(255) UNIQUE NOT NULL",
      request_id: "VARCHAR(255) NOT NULL REFERENCES test_requests(request_id)",
      service_id: "VARCHAR(255) NOT NULL REFERENCES services(service_id)",
      package_id: "VARCHAR(255) REFERENCES packages(package_id)",
      processed_by: "VARCHAR(255) REFERENCES users(user_id)",
      queue_id: "VARCHAR(255) REFERENCES queue_entries(queue_id)",
      bill_id: "VARCHAR(255) REFERENCES bills(bill_id)",
      status: "VARCHAR(50) NOT NULL DEFAULT 'Requested'",
      reason: "VARCHAR(255) NOT NULL DEFAULT 'None'",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "test_results",
    columns: {
      id: "SERIAL PRIMARY KEY",
      result_id: "VARCHAR(255) UNIQUE NOT NULL",
      item_id: "VARCHAR(255) NOT NULL REFERENCES test_request_items(item_id)",
      results: "JSONB NOT NULL DEFAULT '[]'::jsonb",
      status: "VARCHAR(20) NOT NULL DEFAULT 'Pending'",
      remarks: "TEXT",
      image_url: "VARCHAR(500)",
      verified_by: "VARCHAR(255)",
      verified_at: "TIMESTAMP",
      released_at: "TIMESTAMP",
      released_by: "VARCHAR(255)",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "form_templates",
    columns: {
      id: "SERIAL PRIMARY KEY",
      form_id: "VARCHAR(255) UNIQUE NOT NULL",
      form_name: "VARCHAR(255) NOT NULL",
      form_description: "TEXT",
      service_id: "VARCHAR(255) NOT NULL REFERENCES services(service_id)",
      status: "VARCHAR(50) NOT NULL DEFAULT 'Published'",
      created_by: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      version: "INTEGER NOT NULL DEFAULT 1",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "form_component_types",
    columns: {
      id: "SERIAL PRIMARY KEY",
      type_id: "VARCHAR(255) UNIQUE NOT NULL",
      type_name: "VARCHAR(100) NOT NULL UNIQUE",
      data_type: "VARCHAR(50) NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "form_components",
    columns: {
      id: "SERIAL PRIMARY KEY",
      form_component_id: "VARCHAR(255) UNIQUE NOT NULL",
      form_id: "VARCHAR(255) NOT NULL REFERENCES form_templates(form_id)",
      type_id: "VARCHAR(255) NOT NULL REFERENCES form_component_types(type_id)",
      label: "VARCHAR(255) NOT NULL",
      field_key: "VARCHAR(255) NOT NULL",
      display_order: "INTEGER NOT NULL",
      settings: "JSONB",
      validation: "JSONB",
    },
  },

  {
    table: "system_activity",
    columns: {
      id: "SERIAL PRIMARY KEY",
      activity_id: "VARCHAR(255) UNIQUE NOT NULL",
      user_id: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      service_name: "VARCHAR(255) NOT NULL REFERENCES services(service_name)",
      details: "JSONB NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "activity_logs",
    columns: {
      id: "SERIAL PRIMARY KEY",
      user_id: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      action_id: "INTEGER NOT NULL",
      status: "VARCHAR(255) NOT NULL",
      target_type: "VARCHAR(100) NOT NULL",
      target_id: "VARCHAR(255) NOT NULL",
      metadata: "JSONB",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "actions",
    columns: {
      action_id: "SERIAL PRIMARY KEY",
      action_name: "VARCHAR(255) NOT NULL UNIQUE",
      action_description: "TEXT",
      module: "VARCHAR(100) NOT NULL",
      is_sensitive: "BOOLEAN NOT NULL DEFAULT TRUE",
    },
  },

  // In-app queue notifications for doctors, lab staff and patients.
  // One row per person. Each person keeps only their 10 newest
  // (services/notifications/notify.ts deletes the older ones).
  {
    table: "notifications",
    columns: {
      id: "SERIAL PRIMARY KEY",
      recipient_type: "VARCHAR(10) NOT NULL", // 'user' (staff) or 'patient'
      recipient_id: "VARCHAR(255) NOT NULL", // users.user_id or patients.patient_id
      type: "VARCHAR(50) NOT NULL", // priority-patient, cancellation, queued, called, skipped
      title: "VARCHAR(255) NOT NULL",
      message: "TEXT",
      is_read: "BOOLEAN NOT NULL DEFAULT FALSE",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "sse_test",
    columns: {
      message_id: "SERIAL PRIMARY KEY",
      message: "VARCHAR(255) NOT NULL",
    },
  },
];

// =======================================================================
// HELPERS
// =======================================================================

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function generateCreateTableSQL(table: TableDefinition): string {
  const definitions = Object.entries(table.columns).map(
    ([column, definition]) => `${quoteIdentifier(column)} ${definition}`,
  );

  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(table.table)} (
      ${definitions.join(",\n")}
    )
  `;
}

// =======================================================================
// ENSURE LABORATORY RESULT STATUS
// =======================================================================

// export async function ensureLaboratoryResultStatus(): Promise<void> {
//   await sql`
//     ALTER TABLE test_results
//     ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Pending',
//     ADD COLUMN IF NOT EXISTS released_at TIMESTAMP,
//     ADD COLUMN IF NOT EXISTS released_by VARCHAR(255)
//   `;
// }

// =======================================================================
// CONNECT TO DATABASE
// =======================================================================

// The link to Neon (us-east-2) sometimes drops for a few seconds. Retry a few
// times instead of crashing the server on a single timeout.
const CONNECT_ATTEMPTS = 5;

export async function connectNeon(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await createTables();
    } catch (error) {
      if (attempt >= CONNECT_ATTEMPTS) throw error;
      const delayMs = 1000 * 2 ** (attempt - 1);
      console.warn(
        `[db] connection attempt ${attempt}/${CONNECT_ATTEMPTS} failed (${(error as Error).message}); retrying in ${delayMs / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function createTables(): Promise<void> {
  try {
    // One HTTP round trip for every CREATE TABLE instead of one per table.
    await sql.transaction(
      TABLES.map((table) => sql.query(generateCreateTableSQL(table))),
    );

    // await ensureLaboratoryResultStatus();
    // await sql`
    //   ALTER TABLE consultation_records
    //   ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255)
    // `;

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing DB:", error);
    throw error;
  }
}

// =======================================================================
// SYNC DATABASE SCHEMA
// =======================================================================

export async function syncSchema(onlyTables?: string[]): Promise<void> {
  try {
    console.log("[schema-sync] starting...");

    const configuredTables = onlyTables
      ? TABLES.filter((table) => onlyTables.includes(table.table))
      : TABLES;

    const configuredTableNames = configuredTables.map((table) => table.table);

    // ---------------------------------------------------------------
    // 1. GET EXISTING TABLES
    // ---------------------------------------------------------------

    const existingTableRows = (await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `) as { table_name: string }[];

    const existingTableNames = existingTableRows.map((row) => row.table_name);

    // ---------------------------------------------------------------
    // 2. DROP EXTRA TABLES
    //
    // Only during full synchronization.
    // Selective synchronization must not drop unrelated tables.
    // ---------------------------------------------------------------

    if (!onlyTables) {
      const tablesToDrop = existingTableNames.filter(
        (name) => !configuredTableNames.includes(name),
      );

      for (const tableName of tablesToDrop) {
        console.log(`[schema-sync] dropping extra table "${tableName}"`);

        await sql.query(
          `DROP TABLE IF EXISTS ${quoteIdentifier(tableName)} CASCADE`,
        );
      }
    }

    // ---------------------------------------------------------------
    // 3. PROCESS CONFIGURED TABLES
    // ---------------------------------------------------------------

    for (const tableDefinition of configuredTables) {
      const { table: tableName, columns: desiredColumns } = tableDefinition;

      // -------------------------------------------------------------
      // TABLE DOES NOT EXIST
      // -------------------------------------------------------------

      if (!existingTableNames.includes(tableName)) {
        console.log(
          `[schema-sync] ${tableName}: table does not exist, creating...`,
        );

        await sql.query(generateCreateTableSQL(tableDefinition));

        console.log(`[schema-sync] ${tableName}: created`);

        continue;
      }

      // -------------------------------------------------------------
      // GET EXISTING COLUMNS
      // -------------------------------------------------------------

      const existingColumnRows = (await sql`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `) as {
        column_name: string;
        data_type: string;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
        is_nullable: string;
        column_default: string | null;
      }[];

      const existingColumnNames = existingColumnRows.map(
        (column) => column.column_name,
      );

      const desiredColumnNames = Object.keys(desiredColumns);

      // -------------------------------------------------------------
      // CHECK EXISTING PRIMARY KEY
      // -------------------------------------------------------------

      const primaryKeyRows = (await sql`
        SELECT
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
          AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = ${tableName}
          AND tc.constraint_type = 'PRIMARY KEY'
      `) as { column_name: string }[];

      const hasPrimaryKey = primaryKeyRows.length > 0;

      // -------------------------------------------------------------
      // FIND MISSING COLUMNS
      // -------------------------------------------------------------

      const columnsToAdd = desiredColumnNames.filter(
        (columnName) => !existingColumnNames.includes(columnName),
      );

      // -------------------------------------------------------------
      // FIND EXTRA COLUMNS
      // -------------------------------------------------------------

      const columnsToDrop = existingColumnNames.filter(
        (columnName) => !desiredColumnNames.includes(columnName),
      );

      // -------------------------------------------------------------
      // NOTHING TO CHANGE
      // -------------------------------------------------------------

      if (columnsToAdd.length === 0 && columnsToDrop.length === 0) {
        console.log(`[schema-sync] ${tableName}: already in sync`);

        continue;
      }

      // -------------------------------------------------------------
      // ADD MISSING COLUMNS
      // -------------------------------------------------------------

      for (const columnName of columnsToAdd) {
        let definition = desiredColumns[columnName];

        console.log(
          `[schema-sync] ${tableName}: adding column "${columnName}"`,
        );

        const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(definition);

        // -----------------------------------------------------------
        // PREVENT MULTIPLE PRIMARY KEYS
        //
        // If the table already has a primary key, the new column
        // must not attempt to create another one.
        // -----------------------------------------------------------

        if (isPrimaryKey && hasPrimaryKey) {
          console.warn(
            `[schema-sync] ${tableName}.${columnName}: ` +
              `existing primary key detected. Adding column without ` +
              `PRIMARY KEY constraint.`,
          );

          definition = definition.replace(/\s+PRIMARY\s+KEY\b/i, "");
        }

        const isNotNull = /\bNOT\s+NULL\b/i.test(definition);
        const hasDefault = /\bDEFAULT\b/i.test(definition);

        // -----------------------------------------------------------
        // CASE 1: NOT NULL + DEFAULT
        // -----------------------------------------------------------

        if (isNotNull && hasDefault) {
          await sql.query(`
            ALTER TABLE ${quoteIdentifier(tableName)}
            ADD COLUMN ${quoteIdentifier(columnName)} ${definition}
          `);

          continue;
        }

        // -----------------------------------------------------------
        // CASE 2: NOT NULL WITHOUT DEFAULT
        // -----------------------------------------------------------

        if (isNotNull && !hasDefault) {
          const nullableDefinition = definition.replace(/\s+NOT\s+NULL\b/i, "");

          await sql.query(`
            ALTER TABLE ${quoteIdentifier(tableName)}
            ADD COLUMN ${quoteIdentifier(columnName)} ${nullableDefinition}
          `);

          const result = (await sql.query(`
            SELECT COUNT(*)::int AS count
            FROM ${quoteIdentifier(tableName)}
            WHERE ${quoteIdentifier(columnName)} IS NULL
          `)) as { count: number }[];

          const nullCount = Number(result[0]?.count ?? 0);

          if (nullCount === 0) {
            await sql.query(`
              ALTER TABLE ${quoteIdentifier(tableName)}
              ALTER COLUMN ${quoteIdentifier(columnName)}
              SET NOT NULL
            `);

            console.log(
              `[schema-sync] ${tableName}.${columnName}: NOT NULL applied`,
            );
          } else {
            console.warn(
              `[schema-sync] ${tableName}.${columnName}: ` +
                `added as nullable because ${nullCount} existing ` +
                `row(s) contain NULL.`,
            );
          }

          continue;
        }

        // -----------------------------------------------------------
        // CASE 3: REGULAR COLUMN
        // -----------------------------------------------------------

        await sql.query(`
          ALTER TABLE ${quoteIdentifier(tableName)}
          ADD COLUMN ${quoteIdentifier(columnName)} ${definition}
        `);
      }

      // -------------------------------------------------------------
      // DROP EXTRA COLUMNS
      // -------------------------------------------------------------

      for (const columnName of columnsToDrop) {
        console.log(
          `[schema-sync] ${tableName}: dropping extra column "${columnName}"`,
        );

        await sql.query(`
          ALTER TABLE ${quoteIdentifier(tableName)}
          DROP COLUMN ${quoteIdentifier(columnName)} CASCADE
        `);
      }

      console.log(`[schema-sync] ${tableName}: schema updated`);
    }

    console.log("[schema-sync] database schema synchronized successfully");
  } catch (error) {
    console.error("[schema-sync] Error synchronizing database schema:", error);

    throw error;
  }
}
