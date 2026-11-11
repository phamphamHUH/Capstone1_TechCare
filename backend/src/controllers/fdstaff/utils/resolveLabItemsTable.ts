import { sql } from "../../../config/db.js";

export async function resolveLabItemsTable(): Promise<
  "test_request_items" | "request_items" | null
> {
  const laboratoryRequestItems = (await sql`
    SELECT to_regclass('public.test_request_items') AS table_name
  `) as { table_name: string | null }[];

  if (laboratoryRequestItems[0]?.table_name) {
    return "test_request_items";
  }

  const requestItems = (await sql`
    SELECT to_regclass('public.request_items') AS table_name
  `) as { table_name: string | null }[];

  if (requestItems[0]?.table_name) {
    return "request_items";
  }

  return null;
}
