import { describe, expect, it } from "vitest";

import {
  sanitizeFeedbackText,
  sanitizeIdempotencyKeyCandidate,
  sanitizeNullableEmail,
  sanitizeNullableTag,
} from "@/shared/validation/sanitize";

describe("sanitizeFeedbackText", () => {
  it("trims and strips null bytes", () => {
    expect(sanitizeFeedbackText("  hi\u0000there  ")).toBe("hithere");
  });
});

describe("sanitizeNullableEmail", () => {
  it("lowers and rejects empty", () => {
    expect(sanitizeNullableEmail(" Test@EXAMPLE.com ")).toBe("test@example.com");

    expect(sanitizeNullableEmail("   ")).toBe(null);
  });
});

describe("sanitizeNullableTag", () => {
  it("caps length and strips null bytes", () => {
    const big = "a".repeat(300);
    expect((sanitizeNullableTag(big) ?? "").length).toBe(256);

    expect(sanitizeNullableTag(" x\u0000y ")).toBe("xy");
  });
});

describe("sanitizeIdempotencyKeyCandidate", () => {
  it("strips NULs and clamps length before schema validation", () => {
    expect(sanitizeIdempotencyKeyCandidate(`a`.repeat(300)).length).toBe(255);

    expect(sanitizeIdempotencyKeyCandidate(" hi\u0000x ")).toBe("hix");
  });
});
