export const dynamic = "force-dynamic";

import { feedbackApiOptionsResponse } from "@/server/http/feedback-options";
import {
  lazyFeedbackControllers,
  withFeedbackApiEnvelope,
} from "@/server/http/with-api-feedback-envelope";
import type { NextRequest } from "next/server";

export async function OPTIONS(req: NextRequest) {
  return feedbackApiOptionsResponse(req);
}

export async function GET(req: NextRequest) {
  const ctrl = lazyFeedbackControllers();

  return withFeedbackApiEnvelope(req, "read", () => ctrl.list(req));
}

export async function POST(req: NextRequest) {
  const ctrl = lazyFeedbackControllers();

  return withFeedbackApiEnvelope(req, "write", () => ctrl.create(req));
}
