import type { FeedbackAnalysis } from "@/server/models";
import type { IAnalysisCache } from "@/server/ports/analysis-cache.port";

/** In-process dedupe for analysis; swap for Redis in multi-instance deploys. */
export class InMemoryAnalysisCacheAdapter implements IAnalysisCache {
  private readonly store = new Map<string, FeedbackAnalysis>();

  get(hash: string): FeedbackAnalysis | null {
    const hit = this.store.get(hash);
    return hit === undefined ? null : hit;
  }

  set(hash: string, value: FeedbackAnalysis): void {
    this.store.set(hash, value);
  }
}
