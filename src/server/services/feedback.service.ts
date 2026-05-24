import type {
  CreateFeedbackInput,
  FeedbackAnalysis,
  FeedbackListQuery,
  FeedbackRecord,
} from "@/server/models";
import { AnalysisExecutionError } from "@/server/models/analysis-execution-error";
import { AppError } from "@/server/models/app-error";
import type { PaginatedResult } from "@/server/models/paginated-result";
import type { IAnalysisCache } from "@/server/ports/analysis-cache.port";
import type { IAnalysisPort } from "@/server/ports/analysis.port";
import type { IFeedbackRepository } from "@/server/ports/feedback-repository.port";
import type { ILogger } from "@/server/ports/logger.port";
import {
  hashFeedbackAnalysisCacheKey,
} from "@/server/util/feedback-analysis-cache-key";

/** Application use-case: assumes inputs already validated/sanitized at HTTP boundary */
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
    input: CreateFeedbackInput,
    opts?: { idempotencyKey?: string },
  ): Promise<{ replayed: boolean; record: FeedbackRecord }> {
    const idempotencyKey = opts?.idempotencyKey ?? null;

    if (typeof idempotencyKey === "string") {
      const prior = await this.repo.findFeedbackByIdempotencyKey(
        idempotencyKey,
      );

      if (prior !== null) {
        return { replayed: true, record: prior };
      }
    }

    const hash = hashFeedbackAnalysisCacheKey(input.text);
    let analysisResult: FeedbackAnalysis | null = this.cache.get(hash);

    if (analysisResult === null) {
      try {
        analysisResult = await this.analysis.analyze(input.text);
      }
      catch (err: unknown) {
        if (err instanceof AnalysisExecutionError) {
          this.log.warn("feedback_create_upstream_failed", {});
          throw new AppError(
            "Upstream analysis failed.",
            502,
            "UPSTREAM_ERROR",
          );
        }

        throw err;
      }

      this.cache.set(hash, analysisResult);
    }

    const outcome = await this.repo.persistFeedback(
      typeof idempotencyKey === "string" ? idempotencyKey : null,
      input,
      analysisResult,
    );

    return { replayed: outcome.reused, record: outcome.record };
  }

  async getFeedback(id: number): Promise<FeedbackRecord> {
    if (
      typeof id !== "number"
      || !Number.isFinite(id)
      || id < 1
      || !Number.isSafeInteger(id)
      || Math.floor(id) !== id
    ) {
      throw new AppError("Invalid feedback id.", 400, "INVALID_ID", [
        { path: "id", message: "Invalid id" },
      ]);
    }

    const record = await this.repo.findById(id);

    if (record === null) {
      throw new AppError("Feedback not found.", 404, "NOT_FOUND");
    }

    return record;
  }

  async listFeedback(
    query: FeedbackListQuery,
  ): Promise<PaginatedResult<FeedbackRecord>> {
    return this.repo.list(query);
  }
}
