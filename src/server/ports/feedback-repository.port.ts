import type {
  CreateFeedbackInput,
  FeedbackAnalysis,
  FeedbackListQuery,
  FeedbackRecord,
} from "@/server/models";
import type { PaginatedResult } from "@/server/models/paginated-result";

export type PersistFeedbackOutcome = {
  reused: boolean;
  record: FeedbackRecord;
};

export interface IFeedbackRepository {
  findFeedbackByIdempotencyKey(requestKey: string): Promise<
    FeedbackRecord | null
  >;

  persistFeedback(
    idempotencyKey: string | null,
    input: CreateFeedbackInput,
    analysis: FeedbackAnalysis,
  ): Promise<PersistFeedbackOutcome>;

  findById(id: number): Promise<FeedbackRecord | null>;

  list(query: FeedbackListQuery): Promise<PaginatedResult<FeedbackRecord>>;
}
