import { describe, expect, it } from "vitest";

import { idempotencyKeySchema } from "@/shared/validation/feedback.schemas";

describe("idempotencyKeySchema", () => {
  it("accepts Stripe-style ASCII tokens length 16–255", () => {
    const key = "[^]+".repeat(4);

    expect(idempotencyKeySchema.safeParse(key).success).toBe(true);
  });

  it("rejects short tokens", () => {
    expect(idempotencyKeySchema.safeParse("short").success).toBe(false);
  });
});
