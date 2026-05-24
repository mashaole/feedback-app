import { categoryForError } from "@/shared/api/error-codes";
import type { ErrorCategory } from "@/shared/api/error-codes";
import type { ValidationDetailField } from "@/shared/api/validation-detail";

interface ApiEnvelopeErrorPayload {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: ValidationDetailField[];
    retryAfterMs?: number;
  };
}

export class ApiClientError extends Error {
  readonly status: number;

  readonly code: string;

  readonly category: ErrorCategory;

  readonly details?: ValidationDetailField[];

  readonly retryAfterMs?: number;

  readonly requestId?: string;

  constructor(
    message: string,
    opts: {
      status: number;
      code: string;
      category: ErrorCategory;
      details?: ValidationDetailField[];
      retryAfterMs?: number;
      requestId?: string;
    },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = opts.status;
    this.code = opts.code;
    this.category = opts.category;
    this.details = opts.details;
    this.retryAfterMs = opts.retryAfterMs;
    this.requestId = opts.requestId;
  }

  static async fromResponse(resp: Response): Promise<ApiClientError> {
    let bodyUnknown: ApiEnvelopeErrorPayload | null = null;

    try {
      bodyUnknown =
        await resp.clone().json() as ApiEnvelopeErrorPayload;
    } catch {
      bodyUnknown = null;
    }

    const errNested = bodyUnknown?.error ?? null;

    const codeDetected =
      typeof errNested?.code === "string" ? errNested.code : "UNKNOWN";

    const messageDetected =
      typeof errNested?.message === "string"
        ? errNested.message
        : resp.statusText;

    const rid =
      typeof errNested?.requestId === "string" ? errNested.requestId : undefined;

    const detailsSafe = Array.isArray(errNested?.details)
      ? errNested.details.filter((d): d is ValidationDetailField =>
        typeof d === "object"
        && d !== null
        && "field" in d
        && "message" in d
        && typeof (d as ValidationDetailField).field === "string"
        && typeof (d as ValidationDetailField).message === "string",
      )
      : undefined;

    const retryAfterRaw = errNested?.retryAfterMs;
    const retryAfterMs =
      typeof retryAfterRaw === "number"
        ? retryAfterRaw
        : undefined;

    const categoryMerged = categoryForError(resp.status, codeDetected);

    return new ApiClientError(messageDetected, {
      status: resp.status,
      code: codeDetected,
      category: categoryMerged,
      details: detailsSafe?.length === 0 ? undefined : detailsSafe,
      retryAfterMs,
      requestId: rid,
    });
  }
}

export function classifyFromStatusAndCode(
  status: number,
  code?: string | null,
): ErrorCategory {
  const codeSafe = typeof code === "string" ? code : "UNKNOWN";

  return categoryForError(status, codeSafe);
}
