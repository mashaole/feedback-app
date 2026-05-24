/**
 * Domain persistence and query shapes for feedback (hexagonal inner layer).
 * HTTP DTOs live under shared/api later; DAO maps rows ↔ these types.
 */

export type SentimentLabel = "positive" | "neutral" | "negative";

export type PriorityLabel = "P0" | "P1" | "P2" | "P3";

export interface FeedbackAnalysis {
  summary: string;
  sentiment: SentimentLabel;
  tags: string[];
  priority: PriorityLabel;
  nextAction: string;
}

export interface CreateFeedbackInput {
  text: string;
  email: string | null;
}

export interface FeedbackRecord {
  id: number;
  text: string;
  email: string | null;
  createdAt: Date;
  summary: string;
  sentiment: SentimentLabel;
  tags: string[];
  priority: PriorityLabel;
  nextAction: string;
}

/**
 * Column layout returned by Postgres `feedback` (`SELECT *` / `RETURNING *`).
 */
export interface FeedbackRow {
  id: string;
  text: string;
  email: string | null;
  created_at: Date;
  summary: string;
  sentiment: string;
  tags: string[];
  priority: string;
  next_action: string;
}

export interface FeedbackListQuery {
  page: number;
  pageSize: number;
  sentiment?: SentimentLabel | null;
  tag?: string | null;
}
