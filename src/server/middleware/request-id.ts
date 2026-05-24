import { randomUUID } from "node:crypto";

export function incomingOrGeneratedRequestId(
  headerValue: string | null,
): string {
  const t = typeof headerValue === "string" ? headerValue.trim() : "";

  return t !== "" ? t : randomUUID();
}
