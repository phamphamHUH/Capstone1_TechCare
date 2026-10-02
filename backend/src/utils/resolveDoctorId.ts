import type { Request } from "express";

// The auth middleware only runs in production, so outside production req.user
// is absent and we accept doctor_id from the body (dev/testing only).
export function resolveDoctorId(req: Request): string | null {
  const fromToken = (req.user as { user_id?: string | number } | undefined)?.user_id;
  if (fromToken !== undefined && fromToken !== null) return String(fromToken);
  const fromBody = typeof req.body?.doctor_id === "string" ? req.body.doctor_id.trim() : "";
  return fromBody || null;
}
