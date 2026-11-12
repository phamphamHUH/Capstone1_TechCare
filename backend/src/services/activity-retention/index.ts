import { sql } from "../../config/db.js";

// Activity rows older than this are deleted so the logs don't grow forever.
const RETENTION = "3 months";
const DAY_MS = 24 * 60 * 60 * 1000;

async function pruneActivity() {
  try {
    const logs = await sql`
      DELETE FROM activity_logs
      WHERE created_at < NOW() - ${RETENTION}::interval
      RETURNING id
    `;
    const system = await sql`
      DELETE FROM system_activity
      WHERE created_at < NOW() - ${RETENTION}::interval
      RETURNING id
    `;
    if (logs.length || system.length) {
      console.log(
        `[activity-retention] removed ${logs.length} activity logs and ${system.length} system activity rows older than ${RETENTION}`,
      );
    }
  } catch (error) {
    console.error("[activity-retention] cleanup failed:", error);
  }
}

/** Runs the cleanup now and then once a day while the server is up. */
export function startActivityRetention() {
  void pruneActivity();
  setInterval(() => void pruneActivity(), DAY_MS).unref();
}
