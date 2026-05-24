import { z } from "zod";

import { AppError } from "@/server/models/app-error";
import type { ValidationIssue } from "@/server/models/api-error";

export const createFeedbackInputSchema = z.object({
  text: z.string().min(1).max(10000),
  email: z
    .union([z.email(), z.literal(""), z.null(), z.literal(undefined)])
    .transform((v) => {
      if (v === undefined || v === "") {
        return null;
      }
      return v;
    }),
});

export const feedbackListQuerySchema = z.object({
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
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() === "" ? null : v)),
});

export function validationIssuesFromZod(err: z.ZodError): ValidationIssue[] {
  return err.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

export function throwValidationAppError(error: z.ZodError): never {
  const details = validationIssuesFromZod(error);
  throw new AppError(
    "Validation failed",
    400,
    "VALIDATION_ERROR",
    details.length > 0 ? details : [{ path: "", message: "Invalid input" }],
  );
}
