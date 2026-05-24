export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: ValidationIssue[];
  retryAfterMs?: number;
}
