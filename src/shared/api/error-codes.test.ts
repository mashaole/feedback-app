import { describe, expect, it } from "vitest";

import { categoryForError } from "@/shared/api/error-codes";

describe("categoryForError", () => {
  it("maps common status and code combos", () => {
    expect(categoryForError(400, "INVALID_ID")).toBe("validation");

    expect(categoryForError(429, "RATE_LIMIT_EXCEEDED")).toBe("rateLimit");

    expect(categoryForError(502, "UPSTREAM_ERROR")).toBe("upstream");

    expect(categoryForError(503, "SERVICE_UNAVAILABLE")).toBe("unavailable");
  });
});
