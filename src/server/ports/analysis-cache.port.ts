import type { FeedbackAnalysis } from "@/server/models";

/**
 * Dedupes identical normalized feedback text hashes to avoid redundant AI calls.
 */

export interface IAnalysisCache {
  get(hash: string): FeedbackAnalysis | null;

  set(hash: string, value: FeedbackAnalysis): void;
}
