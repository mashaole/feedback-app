import { AppError } from "@/server/models/app-error";
import type { ParsedEnv } from "@/server/config/env";
import type { NextRequest } from "next/server";

export function assertApiKeyWhenConfigured(
  req: NextRequest,
  env: ParsedEnv,
): void {
  if (env.API_KEY_TRIMMED === null) {
    return;
  }

  const incoming = req.headers.get("x-api-key");
  const trimmed = typeof incoming === "string" ? incoming.trim() : "";

  if (trimmed === "" || trimmed !== env.API_KEY_TRIMMED) {
    throw new AppError("Unauthorized.", 401, "UNAUTHORIZED");
  }
}
