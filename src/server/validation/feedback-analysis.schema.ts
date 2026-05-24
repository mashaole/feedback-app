import { z } from "zod";

export const feedbackAnalysisSchema = z.object({
  summary: z.string().min(1).max(8000),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  tags: z.array(z.string().trim().min(1).max(64)).min(1).max(5),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  nextAction: z.string().min(1).max(8000),
});
