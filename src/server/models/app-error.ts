import type { ValidationIssue } from "@/server/models/api-error";

export class AppError extends Error {
  readonly statusCode: number;

  readonly code: string;

  readonly details?: ValidationIssue[];

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: ValidationIssue[],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
