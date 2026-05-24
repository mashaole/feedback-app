import type { z } from "zod";

export interface ValidationIssueField {
  field: string;
  message: string;
  code?: string;
}

export function mapZodErrorToIssues(err: z.ZodError): ValidationIssueField[] {
  return err.issues.map((issue) => ({
    field: issue.path.join(".") === "" ? "body" : issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}
