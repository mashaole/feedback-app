import type { ReactElement } from "react";

import { FeedbackSubmitPanel } from "@/components/feedback-submit-panel";
import { FeedbackErrorBoundary } from "@/components/feedback-error-boundary";
import { FeedbackSubmitProvider } from "@/contexts/feedback-submit-context";

export default function HomePage(): ReactElement {
  return (
    <FeedbackErrorBoundary>
      <FeedbackSubmitProvider>
        <FeedbackSubmitPanel />
      </FeedbackSubmitProvider>
    </FeedbackErrorBoundary>
  );
}
