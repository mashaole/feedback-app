import type {
  ValidationDetailField,
} from "@/shared/api/validation-detail";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type { ValidationDetailField };

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId?: string;
  details?: ValidationDetailField[];
  retryAfterMs?: number;
}
