/**
 * Stable HTTP-facing shapes for JSON responses (anti-corruption for UI + Postman).
 * Do not import from server code; frontend + Postman consume this layer only.
 */

export type FeedbackSentiment = "positive" | "neutral" | "negative";

export type FeedbackPriority = "P0" | "P1" | "P2" | "P3";

export interface FeedbackAnalysisDto {
  summary: string;
  sentiment: FeedbackSentiment;
  tags: string[];
  priority: FeedbackPriority;
  nextAction: string;
}

export interface FeedbackDto {
  id: number;
  text: string;
  email: string | null;
  createdAt: string;
  summary: string;
  sentiment: FeedbackSentiment;
  tags: string[];
  priority: FeedbackPriority;
  nextAction: string;
}

export interface CreateFeedbackRequestBody {
  text: string;
  email?: string | null;
}

export interface PaginatedFeedbackListDto {
  items: FeedbackDto[];
  total: number;
  page: number;
  pageSize: number;
}