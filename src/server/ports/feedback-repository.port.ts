import type {
  CreateFeedbackInput,
  FeedbackAnalysis,
  FeedbackListQuery,
  FeedbackRecord,
} from "@/server/models";
import type { PaginatedResult } from "@/server/models/paginated-result";

export interface IFeedbackRepository {
  create(
    input: CreateFeedbackInput,
    analysis: FeedbackAnalysis,
  ): Promise<FeedbackRecord>;

  findById(id: number): Promise<FeedbackRecord | null>;

  list(query: FeedbackListQuery): Promise<PaginatedResult<FeedbackRecord>>;
}
