import { DatabaseError } from "pg";
import { describe, expect, it } from "vitest";

import type { ParsedEnv } from "@/server/config/env";

import {
  fallbackErrorEnvelope,
  serializeAppError,
  statusFromError,
} from "@/server/middleware/error-serializer";
import { AppError } from "@/server/models/app-error";

function testEnv(): ParsedEnv {
  return { NODE_ENV: "development" } as ParsedEnv;
}

describe("error-serializer", () => {
  it("serializes AppError with mapped details", () => {
    const err = new AppError("Bad", 400, "VALIDATION_ERROR", [{
      path: "text",
      message: "Too short",
    }]);

    expect(serializeAppError(err, "rid-1")).toEqual({
      code: "VALIDATION_ERROR",
      message: "Bad",
      requestId: "rid-1",
      details: [{ field: "text", message: "Too short" }],
    });
  });

  it("maps DatabaseError to SERVICE_UNAVAILABLE", () => {
    const dberr = new DatabaseError("x", 10, "E");

    expect(fallbackErrorEnvelope(dberr, "rid-db", testEnv())).toEqual({
      code: "SERVICE_UNAVAILABLE",
      message: "Database unavailable.",
      requestId: "rid-db",
    });

    expect(statusFromError(dberr, testEnv())).toBe(503);
  });

  it("returns INTERNAL_ERROR for unknown throws", () => {
    const envelope = fallbackErrorEnvelope(
      new Error("boom"),
      "rid-u",
      testEnv(),
    );

    expect(envelope.code).toBe("INTERNAL_ERROR");

    expect(envelope.message).toContain("boom");

    expect(statusFromError(new Error("x"), testEnv())).toBe(500);
  });
});
