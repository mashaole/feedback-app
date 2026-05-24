import type {
  FeedbackAnalysis,
  PriorityLabel,
  SentimentLabel,
} from "@/server/models";
import type { IAnalysisPort } from "@/server/ports/analysis.port";
import { hashFeedbackAnalysisCacheKey } from "@/server/util/feedback-analysis-cache-key";

const MOCK_SENTIMENT: SentimentLabel[] = ["positive", "neutral", "negative"];
const MOCK_TAGS = [
  "product",
  "support",
  "billing",
  "feature",
  "bug",
];
const MOCK_PRIORITY: PriorityLabel[] = ["P0", "P1", "P2", "P3"];

function pickStableIndex(hexPrefix: string, modulo: number): number {
  const n = Number.parseInt(hexPrefix, 16);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.abs(n) % modulo;
}

/** Deterministic triage labels from feedback text (`AI_PROVIDER=mock`). */
export class MockAnalysisAdapter implements IAnalysisPort {
  analyze(text: string): Promise<FeedbackAnalysis> {
    const keyHash = hashFeedbackAnalysisCacheKey(text);
    const s1 = pickStableIndex(keyHash.slice(0, 8), MOCK_SENTIMENT.length);
    const s2 = pickStableIndex(keyHash.slice(8, 16), MOCK_TAGS.length);
    const tagCount =
      pickStableIndex(keyHash.slice(16, 20), MOCK_TAGS.length) % 5 + 1;
    const p = pickStableIndex(keyHash.slice(24, 32), MOCK_PRIORITY.length);
    const tags = new Set<string>();

    let iOffset = 0;
    while (tags.size < tagCount && iOffset < MOCK_TAGS.length) {
      tags.add(MOCK_TAGS[(s2 + iOffset) % MOCK_TAGS.length]!);
      iOffset += 1;
    }

    const sentiment = MOCK_SENTIMENT[s1]!;
    const priority = MOCK_PRIORITY[p]!;
    const analysis: FeedbackAnalysis = {
      summary: `Auto triage (mock): sentiment=${sentiment}, priority=${priority}.`,
      sentiment,
      tags: Array.from(tags),
      priority,
      nextAction: "Review queued feedback mock triage recommendation.",
    };

    return Promise.resolve(analysis);
  }
}
