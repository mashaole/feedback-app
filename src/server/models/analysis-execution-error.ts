/** Thrown by AI adapters; mapped to HTTP 502 in FeedbackService. */

export class AnalysisExecutionError extends Error {
  readonly causeUnknown: unknown | undefined;

  constructor(message: string, causeUnknown?: unknown) {
    super(message);
    this.name = "AnalysisExecutionError";
    this.causeUnknown = causeUnknown;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isAnalysisExecutionError(
  value: unknown,
): value is AnalysisExecutionError {
  return value instanceof AnalysisExecutionError;
}
