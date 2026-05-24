import type { FeedbackAnalysis } from "@/server/models";

/**
 * Strategy port for synchronous feedback triage (OpenAI / mock / future APIs).
 */

export interface IAnalysisPort {
  analyze(text: string): Promise<FeedbackAnalysis>;
}
