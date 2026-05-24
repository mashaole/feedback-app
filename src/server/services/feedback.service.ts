import type {
  CreateFeedbackInput,
  FeedbackAnalysis,
  FeedbackListQuery,
  FeedbackRecord,
} from "@/server/models";
import type { ValidationIssue } from "@/server/models/api-error";
import { AppError } from "@/server/models/app-error";
import { AnalysisExecutionError } from "@/server/models/analysis-execution-error";
import type { PaginatedResult } from "@/server/models/paginated-result";
import type { IAnalysisCache } from "@/server/ports/analysis-cache.port";
import type { IAnalysisPort } from "@/server/ports/analysis.port";
import type { IFeedbackRepository } from "@/server/ports/feedback-repository.port";
import type { ILogger } from "@/server/ports/logger.port";
import {
  hashFeedbackAnalysisCacheKey,
} from "@/server/util/feedback-analysis-cache-key";
import {
  createFeedbackInputSchema,
  feedbackListQuerySchema,
  throwValidationAppError,
} from "@/server/validation/feedback-service-input.schema";

const POSITIVE_DECIMAL_INT_REGEX = /^[1-9]\d*$/;

function invalidIdError(): AppError {
  const details: ValidationIssue[] = [{ path: "id", message: "Invalid id" }];
  return new AppError(
    "Invalid feedback id.",
    400,
    "INVALID_ID",
    details,
  );
}

function parseFeedbackId(raw: unknown): number {
  if (
    typeof raw !== "number" && typeof raw !== "string"
  ) {
    throw invalidIdError();
  }

  if (typeof raw === "number") {
    if (
      Number.isFinite(raw)
      && Math.floor(raw) === raw
      && raw >= 1
      && Number.isSafeInteger(raw)
    ) {
      return raw;
    }

    throw invalidIdError();
  }

  const token = raw.trim();
  if (!POSITIVE_DECIMAL_INT_REGEX.test(token)) {
    throw invalidIdError();
  }

  const n = Number(token);
  if (
    Number.isFinite(n)
    && n >= 1
    && Number.isSafeInteger(n)
    && `${n}` === token
  ) {
    return n;
  }

  throw invalidIdError();
}

export class FeedbackService {
  private readonly repo: IFeedbackRepository;

  private readonly analysis: IAnalysisPort;

  private readonly cache: IAnalysisCache;

  private readonly log: ILogger;

  constructor(
    repo: IFeedbackRepository,
    analysis: IAnalysisPort,
    cache: IAnalysisCache,
    logger: ILogger,
  ) {
    this.repo = repo;
    this.analysis = analysis;
    this.cache = cache;
    this.log = logger.child({ component: "FeedbackService" });
  }

  async createFeedback(
    inputRaw: Record<string, unknown>,
  ): Promise<FeedbackRecord> {
    const parsedCreate = createFeedbackInputSchema.safeParse(inputRaw);
    if (!parsedCreate.success) {
      throwValidationAppError(parsedCreate.error);
    }
    const input: CreateFeedbackInput = parsedCreate.data;

    const hash = hashFeedbackAnalysisCacheKey(input.text);
    let analysis: FeedbackAnalysis | null = this.cache.get(hash);

    if (analysis === null) {
      try {
        analysis = await this.analysis.analyze(input.text);
      }
      catch (err: unknown) {
        if (err instanceof AnalysisExecutionError) {
          this.log.warn("feedback_create_analysis_failed", {
            code: "ANALYSIS_FAILED",
          });
          throw new AppError(
            "Upstream analysis failed.",
            502,
            "ANALYSIS_FAILED",
          );
        }

        throw err;
      }

      this.cache.set(hash, analysis);
    }

    return this.repo.create(input, analysis);
  }

  async getFeedback(rawId: unknown): Promise<FeedbackRecord> {
    const id = parseFeedbackId(rawId);
    const record = await this.repo.findById(id);
    if (record === null) {
      throw new AppError("Feedback not found.", 404, "NOT_FOUND");
    }
    return record;
  }

  async listFeedback(
    rawQuery: Record<string, unknown>,
  ): Promise<PaginatedResult<FeedbackRecord>> {
    const parsed = feedbackListQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throwValidationAppError(parsed.error);
    }

    const query: FeedbackListQuery = parsed.data;
    return this.repo.list(query);
  }
}
