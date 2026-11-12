import { sql } from "../../../config/db.js";

export interface LogActivityEntry {
  userId: string;
  actionName: string;
  status: "success" | "failure" | "blocked";
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}

const actionIdCache = new Map<string, number>();

async function getActionId(actionName: string): Promise<Number> {
  if (actionIdCache.has(actionName)) {
    return actionIdCache.get(actionName)!;
  }

  const actions = await sql`
    SELECT action_id from actions WHERE action_name = ${actionName}
  `;

  if (actions.length === 0) {
    throw new Error(
      `Unknown action "${actionName}". Add it to the actions table before logging it.`,
    );
  }

  actionIdCache.set(actionName, actions[0].action_id);
  return actions[0].action_id;
}

export async function logActivity(entry: LogActivityEntry): Promise<void> {
  const {
    userId,
    actionName,
    targetType,
    targetId,
    status,
    metadata = null,
  } = entry;

  const actionId = await getActionId(actionName);
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await sql`
    INSERT INTO activity_logs
      (user_id, action_id, target_type, target_id, status, metadata)
    VALUES
      (${userId}, ${actionId}, ${targetType}, ${targetId}, ${status}, ${metadataJson}::jsonb)
  `;
}
