import { sanitizeIdempotencyKeyCandidate } from "@/shared/validation/sanitize";
import { z } from "zod";

/** Idempotency-Key header token (Stripe-style: 16–255 printable ASCII). */
export const idempotencyKeySchema = z.preprocess(
  (v: unknown): unknown =>
    typeof v === "string" ? sanitizeIdempotencyKeyCandidate(v) : "",
  z
    .string()
    .regex(
      /^[!-~]{16,255}$/u,
      "Use 16–255 printable ASCII characters for Idempotency-Key.",
    ),
);

/** POST /api/feedback body (.strict rejects unknown keys) */
export const createFeedbackBodySchema = z.object({
  text: z.string().min(1).max(10000),
  email: z
    .union([z.string().email(), z.literal(""), z.null(), z.literal(undefined)])
    .optional(),
}).strict();

/** GET /api/feedback query */
export const listFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sentiment: z
    .enum(["positive", "neutral", "negative"])
    .nullable()
    .optional(),
  tag: z
    .string()
    .max(256)
    .nullable()
    .optional(),
});

/** Route param id (string segment) → validated positive integer */
export const feedbackIdParamSchema = z.object({
  id: z.coerce.number().pipe(
    z.number().int().positive().lte(Number.MAX_SAFE_INTEGER),
  ),
});
