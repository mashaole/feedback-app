import { DatabaseError } from "pg";

import type { ParsedEnv } from "@/server/config/env";
import type {
  ApiErrorBody,
  ValidationDetailField,
  ValidationIssue,
} from "@/server/models/api-error";
import { isAppError, type AppError } from "@/server/models/app-error";

function normalizedDetails(
  details: ValidationIssue[] | undefined,
): ValidationDetailField[] {
  return (details ?? []).map((d) => ({
    field: d.path !== "" ? d.path : "body",
    message: d.message,
  }));
}

export function serializeAppError(app: AppError, requestId: string): ApiErrorBody {
  return {
    code: app.code,
    message: app.message,
    requestId,
    details: normalizedDetails(app.details),
    ...(app.retryAfterMs !== undefined
      ? { retryAfterMs: app.retryAfterMs }
      : {}),
  };
}

export function fallbackErrorEnvelope(
  err: unknown,
  requestId: string,
  env: ParsedEnv,
): ApiErrorBody {
  if (isAppError(err)) {
    return serializeAppError(err, requestId);
  }

  if (err instanceof DatabaseError) {
    return {
      code: "SERVICE_UNAVAILABLE",
      message: "Database unavailable.",
      requestId,
    };
  }

  const message =
    env.NODE_ENV === "production"
      ? "Something went wrong."
      : typeof err === "object" && err !== null && "message" in err
      && typeof (err as Error).message === "string"
        ? (err as Error).message
        : String(err);

  return {
    code: "INTERNAL_ERROR",
    message,
    requestId,
  };
}

export function statusFromError(err: unknown, env: ParsedEnv): number {
  if (isAppError(err)) {
    return err.statusCode;
  }

  if (err instanceof DatabaseError) {
    return 503;
  }

  void env;

  return 500;
}
