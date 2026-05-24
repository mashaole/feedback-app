import type { FeedbackRecord } from "@/server/models";
import type { FeedbackDto, PaginatedFeedbackListDto } from "@/shared/api/feedback.contract";
import type { PaginatedResult } from "@/server/models/paginated-result";

export function toFeedbackDto(record: FeedbackRecord): FeedbackDto {
  return {
    id: record.id,
    text: record.text,
    email: record.email,
    createdAt: record.createdAt.toISOString(),
    summary: record.summary,
    sentiment: record.sentiment,
    tags: record.tags,
    priority: record.priority,
    nextAction: record.nextAction,
  };
}

export function toPaginatedListDto(
  page: PaginatedResult<FeedbackRecord>,
): PaginatedFeedbackListDto {
  return {
    items: page.items.map(toFeedbackDto),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  };
}
