import { neon, Pool } from "@neondatabase/serverless";
import { ENV } from "./env.js";

if (!ENV.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export const sql = neon(ENV.DATABASE_URL);
export const pool = new Pool({ connectionString: ENV.DATABASE_URL });

// =======================================================================
// TABLE DEFINITIONS
// =======================================================================

const TABLES: {
  table: string;
  createSQL: string;
  columns: Record<string, string>;
}[] = [
  {
    table: "users",
    createSQL: `CREATE TABLE IF NOT EXISTS users (
      id                      SERIAL PRIMARY KEY,
      user_id                 VARCHAR(255) UNIQUE NOT NULL,
      username                VARCHAR(255) NOT NULL,
      password_hash           VARCHAR(255) NOT NULL,
      first_name              VARCHAR(255) NOT NULL,
      middle_name             VARCHAR(255),
      last_name               VARCHAR(255) NOT NULL,
      suffix                  VARCHAR(20),
      sex                     VARCHAR(20) NOT NULL,
      email                   VARCHAR(255) NOT NULL UNIQUE,
      contact_number          VARCHAR(20) NOT NULL,
      emergency_contact_name  VARCHAR(255),
      emergency_contact       VARCHAR(20),
      address                 TEXT NOT NULL,
      birthdate               DATE NOT NULL,
      role                    VARCHAR(50) NOT NULL,
      department              VARCHAR(100),
      employment_status       VARCHAR(50),
      date_hired              DATE NOT NULL,
      shift_start             TIME NOT NULL DEFAULT '08:00:00',
      shift_end               TIME NOT NULL DEFAULT '17:00:00',
      last_login              TIMESTAMP,
      account_status          BOOLEAN NOT NULL DEFAULT TRUE,
      profile_photo           TEXT,
      active                  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
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
    },
  },

  {
    table: "patients",
    createSQL: `CREATE TABLE IF NOT EXISTS patients (
      id                      SERIAL PRIMARY KEY,
      image_url               TEXT,
      patient_id              VARCHAR(255) UNIQUE NOT NULL,
      username                VARCHAR(255) NOT NULL,
      password_hash           VARCHAR(255) NOT NULL,
      first_name              VARCHAR(255) NOT NULL,
      middle_name             VARCHAR(255),
      last_name               VARCHAR(255) NOT NULL,
      suffix                  VARCHAR(20),
      sex                     VARCHAR(20) NOT NULL,
      email                   VARCHAR(255) NOT NULL UNIQUE,
      address                 TEXT NOT NULL,
      contact_number          VARCHAR(20) NOT NULL,
      civil_status            VARCHAR(50) NOT NULL DEFAULT 'Single',
      blood_type              VARCHAR(50),
      birthdate               DATE NOT NULL,
      emergency_contact_name  VARCHAR(255),
      emergency_contact       VARCHAR(20),
      created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
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
      email: "VARCHAR(255) NOT NULL UNIQUE",
      address: "TEXT NOT NULL",
      contact_number: "VARCHAR(20) NOT NULL",
      civil_status: "VARCHAR(50) NOT NULL DEFAULT 'Single'",
      blood_type: "VARCHAR(50)",
      birthdate: "DATE NOT NULL",
      emergency_contact_name: "VARCHAR(255)",
      emergency_contact: "VARCHAR(20)",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "services",
    createSQL: `CREATE TABLE IF NOT EXISTS services (
      id               SERIAL PRIMARY KEY,
      service_id       VARCHAR(255) UNIQUE NOT NULL,
      service_type     VARCHAR(50) NOT NULL,
      service_name     VARCHAR(255) NOT NULL UNIQUE,
      price            DECIMAL(10,2) NOT NULL,
      active           BOOLEAN NOT NULL DEFAULT TRUE,
      room             VARCHAR(255) NOT NULL,
      service_category VARCHAR(255) NOT NULL,
      created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      service_id: "VARCHAR(255) UNIQUE NOT NULL",
      service_type: "VARCHAR(50) NOT NULL",
      service_name: "VARCHAR(255) NOT NULL UNIQUE",
      price: "DECIMAL(10,2) NOT NULL",
      active: "BOOLEAN NOT NULL DEFAULT TRUE",
      room: "VARCHAR(255) NOT NULL",
      service_category: "VARCHAR(255)",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "packages",
    createSQL: `CREATE TABLE IF NOT EXISTS packages (
      package_id    SERIAL PRIMARY KEY,
      package_name  VARCHAR(255) NOT NULL,
      package_price NUMERIC(10,2) NOT NULL,
      service_ids   VARCHAR(255)[] NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      package_id: "SERIAL PRIMARY KEY",
      package_name: "VARCHAR(255) NOT NULL",
      package_price: "NUMERIC(10,2) NOT NULL",
      service_ids: "VARCHAR(255)[] NOT NULL",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "queue_entries",
    createSQL: `CREATE TABLE IF NOT EXISTS queue_entries (
      id           SERIAL PRIMARY KEY,
      queue_id     VARCHAR(255) UNIQUE NOT NULL,
      patient_id   VARCHAR(255) REFERENCES patients(patient_id),
      queue_number INTEGER NOT NULL,
      service_id   VARCHAR(255) NOT NULL REFERENCES services(service_id),
      is_priority  BOOLEAN NOT NULL DEFAULT FALSE,
      status       VARCHAR(20) NOT NULL DEFAULT 'waiting',
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      queue_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) REFERENCES patients(patient_id)",
      queue_number: "INTEGER NOT NULL",
      service_id: "VARCHAR(255) NOT NULL REFERENCES services(service_id)",
      is_priority: "BOOLEAN NOT NULL DEFAULT FALSE",
      status: "VARCHAR(20) NOT NULL DEFAULT 'waiting'",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "consultation_records",
    createSQL: `CREATE TABLE IF NOT EXISTS consultation_records (
      id                      SERIAL PRIMARY KEY,
      consultation_record_id  VARCHAR(255) UNIQUE NOT NULL,
      patient_id              VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      doctor_id               VARCHAR(255) NOT NULL REFERENCES users(user_id),
      service_id              VARCHAR(255) NOT NULL REFERENCES services(service_id),
      queue_id                VARCHAR(255) REFERENCES queue_entries(queue_id),
      status                  VARCHAR(255) NOT NULL DEFAULT 'Created',
      consultation_type       VARCHAR(255) NOT NULL DEFAULT 'Initial',
      diagnosis               JSONB,
      presenting_complaint    JSONB,
      vital_signs             JSONB,
      physical_examination    JSONB,
      notes                   JSONB,
      consulted_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      consultation_record_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      doctor_id: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      service_id: "VARCHAR(255) NOT NULL REFERENCES services(service_id)",
      queue_id: "VARCHAR(255) REFERENCES queue_entries(queue_id)",
      status: "VARCHAR(255) NOT NULL DEFAULT 'Created'",
      consultation_type: " VARCHAR(255) NOT NULL DEFAULT 'Initial'",
      diagnosis: "JSONB",
      presenting_complaint: " JSONB",
      vital_signs: "JSONB",
      physical_examination: "JSONB",
      notes: "JSONB",
      consulted_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "prescription_records",
    createSQL: `CREATE TABLE IF NOT EXISTS prescription_records (
      id                      SERIAL PRIMARY KEY,
      prescription_id         VARCHAR(255) UNIQUE NOT NULL,
      consultation_record_id  VARCHAR(255) NOT NULL REFERENCES consultation_records(consultation_record_id),
      patient_id              VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      prescriber_id           VARCHAR(255) NOT NULL REFERENCES users(user_id),
      prescribed_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valid_until             DATE,
      status                  VARCHAR(20) NOT NULL DEFAULT 'Active',
      prescription_items      JSONB NOT NULL,
      notes                   TEXT
    )`,
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
    table: "laboratory_requests",
    createSQL: `CREATE TABLE IF NOT EXISTS laboratory_requests (
      id                      SERIAL PRIMARY KEY,
      request_id              VARCHAR(255) UNIQUE NOT NULL,
      consultation_record_id  VARCHAR(255) REFERENCES consultation_records(consultation_record_id),
      patient_id              VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      requested_by            VARCHAR(255) NOT NULL REFERENCES users(user_id),
      status                  VARCHAR(20) NOT NULL DEFAULT 'Requested',
      is_paid                 BOOLEAN NOT NULL DEFAULT FALSE,
      is_priority             BOOLEAN NOT NULL DEFAULT FALSE,
      request_date            DATE NOT NULL DEFAULT CURRENT_DATE,
      estimated_release_date  DATE,
      requested_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      request_id: "VARCHAR(255) UNIQUE NOT NULL",
      consultation_record_id:
        "VARCHAR(255) REFERENCES consultation_records(consultation_record_id)",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      requested_by: "VARCHAR(255) NOT NULL REFERENCES users(user_id)",
      status: "VARCHAR(20) NOT NULL DEFAULT 'Requested'",
      is_paid: "BOOLEAN NOT NULL DEFAULT FALSE",
      is_priority: "BOOLEAN NOT NULL DEFAULT FALSE",
      request_date: "DATE NOT NULL DEFAULT CURRENT_DATE",
      estimated_release_date: "DATE",
      requested_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "laboratory_request_items",
    createSQL: `CREATE TABLE IF NOT EXISTS laboratory_request_items (
      id          SERIAL PRIMARY KEY,
      lab_item_id   VARCHAR(255) UNIQUE NOT NULL,
      request_id    VARCHAR(255) NOT NULL REFERENCES laboratory_requests(request_id),
      service_id    VARCHAR(255) NOT NULL REFERENCES services(service_id),
      processed_by  VARCHAR(255) REFERENCES users(user_id),
      queue_id      VARCHAR(255) REFERENCES queue_entries(queue_id),
      status        VARCHAR(50) NOT NULL DEFAULT 'Requested',
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      lab_item_id: "VARCHAR(255) UNIQUE NOT NULL",
      request_id:
        "VARCHAR(255) NOT NULL REFERENCES laboratory_requests(request_id)",
      service_id: "VARCHAR(255) NOT NULL REFERENCES services(service_id)",
      processed_by: "VARCHAR(255) REFERENCES users(user_id)",
      queue_id: "VARCHAR(255) REFERENCES queue_entries(queue_id)",
      status: "VARCHAR(50) NOT NULL DEFAULT 'Requested'",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "laboratory_results",
    createSQL: `CREATE TABLE IF NOT EXISTS laboratory_results (
      id              SERIAL PRIMARY KEY,
      result_id       VARCHAR(255) UNIQUE NOT NULL,
      lab_item_id     VARCHAR(255) NOT NULL REFERENCES laboratory_request_items(lab_item_id),
      results         JSONB NOT NULL DEFAULT '[]'::jsonb,
      remarks         TEXT,
      image_url       VARCHAR(500),
      verified_by     VARCHAR(255),
      verified_at     TIMESTAMP,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      result_id: "VARCHAR(255) UNIQUE NOT NULL",
      lab_item_id:
        "VARCHAR(255) NOT NULL REFERENCES laboratory_request_items(lab_item_id)",
      results: "JSONB NOT NULL DEFAULT '[]'::jsonb",
      remarks: "TEXT",
      image_url: "VARCHAR(500)",
      verified_by: "VARCHAR(255)",
      verified_at: "TIMESTAMP",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      updated_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "form_templates",
    createSQL: `CREATE TABLE IF NOT EXISTS form_templates (
      id                SERIAL PRIMARY KEY,
      form_id           VARCHAR(255) UNIQUE NOT NULL,
      form_name         VARCHAR(255) NOT NULL,
      form_description  TEXT,
      service_id        VARCHAR(255) NOT NULL REFERENCES services(service_id),
      status            VARCHAR(255) NOT NULL DEFAULT 'Published',
      created_by        VARCHAR(255) NOT NULL REFERENCES users(user_id),
      version           INTEGER NOT NULL DEFAULT 1,
      created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
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
    createSQL: `CREATE TABLE IF NOT EXISTS form_component_types (
      id          SERIAL PRIMARY KEY,
      type_id     VARCHAR(255) UNIQUE NOT NULL,
      type_name   VARCHAR(100) NOT NULL UNIQUE,
      data_type   VARCHAR(50) NOT NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
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
    createSQL: `CREATE TABLE IF NOT EXISTS form_components (
      id                  SERIAL PRIMARY KEY,
      form_component_id   VARCHAR(255) UNIQUE NOT NULL,
      form_id             VARCHAR(255) NOT NULL REFERENCES form_templates(form_id),
      type_id             VARCHAR(255) NOT NULL REFERENCES form_component_types(type_id),
      label               VARCHAR(255) NOT NULL,
      field_key           VARCHAR(255) NOT NULL,
      display_order       INTEGER NOT NULL,
      settings            JSONB,
      validation          JSONB
    )`,
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
    table: "bills",
    createSQL: `CREATE TABLE IF NOT EXISTS bills (
      id                SERIAL PRIMARY KEY,
      bill_id            VARCHAR(255) UNIQUE NOT NULL,
      patient_id         VARCHAR(255) NOT NULL REFERENCES patients(patient_id),
      items              JSONB NOT NULL,
      discount_pct       DECIMAL(5,2) NOT NULL DEFAULT 0,
      total_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_method     VARCHAR(30) NOT NULL DEFAULT 'Cash',
      status             VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
      receipt_id         VARCHAR(50) UNIQUE,
      created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      receipt_issued_at  TIMESTAMP,
      billed_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    columns: {
      id: "SERIAL PRIMARY KEY",
      bill_id: "VARCHAR(255) UNIQUE NOT NULL",
      patient_id: "VARCHAR(255) NOT NULL REFERENCES patients(patient_id)",
      items: "JSONB NOT NULL",
      discount_pct: "DECIMAL(5,2) NOT NULL DEFAULT 0",
      total_amount: "DECIMAL(10,2) NOT NULL DEFAULT 0",
      payment_method: "VARCHAR(30) NOT NULL DEFAULT 'Cash'",
      status: "VARCHAR(20) NOT NULL DEFAULT 'Unpaid'",
      receipt_id: "VARCHAR(50) UNIQUE",
      created_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
      receipt_issued_at: "TIMESTAMP",
      billed_at: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    },
  },

  {
    table: "system_activity",
    createSQL: `CREATE TABLE IF NOT EXISTS system_activity (
      id           SERIAL PRIMARY KEY,
      activity_id  VARCHAR(255) UNIQUE NOT NULL,
      user_id      VARCHAR(255) NOT NULL REFERENCES users(user_id),
      service_name VARCHAR(255) NOT NULL REFERENCES services(service_name),
      details      JSONB NOT NULL,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
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
    createSQL: `CREATE TABLE IF NOT EXISTS activity_logs (
      id              SERIAL PRIMARY KEY,
      user_id         VARCHAR(255) NOT NULL,
      action_id       INTEGER NOT NULL,
      status          VARCHAR(255) NOT NULL,
      target_type     VARCHAR(100) NOT NULL,
      target_id       VARCHAR(255) NOT NULL,
      metadata        JSONB,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
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
    createSQL: `CREATE TABLE IF NOT EXISTS actions (
      action_id           SERIAL PRIMARY KEY,
      action_name         VARCHAR(255) NOT NULL UNIQUE, 
      action_description  TEXT,
      module              VARCHAR(100) NOT NULL,     
      is_sensitive        BOOLEAN NOT NULL DEFAULT TRUE
    )`,
    columns: {
      action_id: "SERIAL PRIMARY KEY",
      action_name: "VARCHAR(255) NOT NULL UNIQUE",
      action_description: "TEXT",
      module: "VARCHAR(100) NOT NULL",
      is_sensitive: "BOOLEAN NOT NULL DEFAULT TRUE",
    },
  },
];
// -----------------------------------------------------------------------
// CONNECT TO DATABASE
//
// Creates tables that don't exist.
// Does NOT modify existing tables.
//
// Use syncSchema() when you want the database to exactly match TABLES.
// -----------------------------------------------------------------------
export async function connectNeon(): Promise<void> {
  try {
    for (const { createSQL } of TABLES) {
      await sql.query(createSQL);
    }

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing DB:", error);
    throw error;
  }
}

// -----------------------------------------------------------------------
// SYNC DATABASE SCHEMA
//
// TABLES is the source of truth.
//
// This function will:
//
//   1. Create missing tables
//   2. Drop tables that are not defined in TABLES
//   3. Add missing columns
//   4. Drop extra columns
//   5. Change column definitions when necessary
//
// IMPORTANT:
// - Existing data is preserved whenever possible.
// - Tables are NOT dropped/recreated just because a column changed.
// - If nothing changed, no ALTER TABLE is executed.
// - Adding a NOT NULL column to a table with existing rows requires
//   either a DEFAULT or existing rows must be populated first.
// -----------------------------------------------------------------------
export async function syncSchema(onlyTables?: string[]): Promise<void> {
  try {
    console.log("[schema-sync] starting...");

    // ---------------------------------------------------------------
    // Determine which tables we are synchronizing
    // ---------------------------------------------------------------

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
    `) as {
      table_name: string;
    }[];

    const existingTableNames = existingTableRows.map((row) => row.table_name);

    // ---------------------------------------------------------------
    // 2. DROP EXTRA TABLES
    //
    // Example:
    //
    // TABLES contains:
    // users
    // patients
    //
    // Database contains:
    // users
    // patients
    // consultations
    //
    // consultations will be dropped.
    // ---------------------------------------------------------------

    const tablesToDrop = existingTableNames.filter(
      (tableName) => !configuredTableNames.includes(tableName),
    );

    for (const tableName of tablesToDrop) {
      console.log(`[schema-sync] dropping extra table "${tableName}"`);

      await sql.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }

    // ---------------------------------------------------------------
    // 3. PROCESS EACH CONFIGURED TABLE
    // ---------------------------------------------------------------

    for (const tableDefinition of configuredTables) {
      const {
        table: tableName,
        createSQL,
        columns: desiredColumns,
      } = tableDefinition;

      // -------------------------------------------------------------
      // TABLE DOES NOT EXIST
      // -------------------------------------------------------------

      if (!existingTableNames.includes(tableName)) {
        console.log(
          `[schema-sync] ${tableName}: table does not exist, creating...`,
        );

        await sql.query(createSQL);

        console.log(`[schema-sync] ${tableName}: created`);

        continue;
      }

      // -------------------------------------------------------------
      // TABLE EXISTS
      // Get current columns
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
        const definition = desiredColumns[columnName];

        console.log(
          `[schema-sync] ${tableName}: adding column "${columnName}"`,
        );

        const isNotNull = /\bNOT\s+NULL\b/i.test(definition);

        const hasDefault = /\bDEFAULT\b/i.test(definition);

        // -----------------------------------------------------------
        // CASE 1:
        //
        // NOT NULL + DEFAULT
        //
        // Safe because PostgreSQL can populate existing rows.
        // -----------------------------------------------------------

        if (isNotNull && hasDefault) {
          await sql.query(`
            ALTER TABLE "${tableName}"
            ADD COLUMN "${columnName}" ${definition}
          `);

          continue;
        }

        // -----------------------------------------------------------
        // CASE 2:
        //
        // NOT NULL without DEFAULT
        //
        // We cannot safely add this directly if rows already exist.
        //
        // Add it temporarily as nullable.
        // -----------------------------------------------------------

        if (isNotNull && !hasDefault) {
          const nullableDefinition = definition.replace(
            /\s+NOT\s+NULL\b/gi,
            "",
          );

          await sql.query(`
            ALTER TABLE "${tableName}"
            ADD COLUMN "${columnName}" ${nullableDefinition}
          `);

          // ---------------------------------------------------------
          // Check whether existing rows contain NULL.
          // ---------------------------------------------------------

          const result = (await sql.query(`
            SELECT COUNT(*)::int AS count
            FROM "${tableName}"
            WHERE "${columnName}" IS NULL
          `)) as {
            count: number;
          }[];

          const nullCount = result[0]?.count ?? 0;

          // ---------------------------------------------------------
          // If there are no NULL values, enforce NOT NULL.
          // ---------------------------------------------------------

          if (nullCount === 0) {
            await sql.query(`
              ALTER TABLE "${tableName}"
              ALTER COLUMN "${columnName}"
              SET NOT NULL
            `);

            console.log(
              `[schema-sync] ${tableName}.${columnName}: NOT NULL applied`,
            );
          } else {
            console.warn(
              `[schema-sync] ${tableName}.${columnName}: ` +
                `added as nullable because ${nullCount} existing row(s) ` +
                `would contain NULL.`,
            );

            console.warn(
              `[schema-sync] Populate "${columnName}" before making it NOT NULL.`,
            );
          }

          continue;
        }

        // -----------------------------------------------------------
        // CASE 3:
        //
        // Nullable column
        //
        // Safe to add directly.
        // -----------------------------------------------------------

        await sql.query(`
          ALTER TABLE "${tableName}"
          ADD COLUMN "${columnName}" ${definition}
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
          ALTER TABLE "${tableName}"
          DROP COLUMN "${columnName}" CASCADE
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
// To change columns, do this:

// 1. **Edit two spots for the table you're changing**, inside the `TABLES` array:
//    - The `createSQL` string (so a *brand-new* DB gets it right from scratch)
//    - The `columns` object (so `syncSchema()` knows what to add/drop on an *existing* DB)

//    Example — adding an `avatar_url` column to `users`:
//    ```ts
//    createSQL: `CREATE TABLE IF NOT EXISTS users (
//      ...
//      avatar_url     TEXT,
//      ...
//    )`,
//    columns: {
//      ...
//      avatar_url: "TEXT",
//      ...
//    },
//    ```
//    To remove a column, just delete it from both places.

// 2. **Run `syncSchema()`** to apply it to the actual Neon DB. Since it's not auto-triggered, you need to call it yourself — e.g. a quick one-off:
//    ```bash
//    npx tsx -e "import('./src/config/db.js').then(m => m.syncSchema())"
//    ```
//    or `await syncSchema(["users"])` to only touch that one table.

// That's it — edit both spots, then call `syncSchema()`.
