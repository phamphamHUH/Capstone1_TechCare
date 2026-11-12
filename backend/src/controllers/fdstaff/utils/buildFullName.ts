export function buildFullName(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
