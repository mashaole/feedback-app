import type { Metadata } from "next";
import type { ReactElement } from "react";
import React from "react";

import { DetailSkeleton } from "@/components/detail-skeleton";
import { FeedbackDetailPanel } from "@/components/feedback-detail-panel";
import { FeedbackErrorBoundary } from "@/components/feedback-error-boundary";
import { FeedbackDetailProvider } from "@/contexts/feedback-detail-context";

export const metadata: Metadata = {
  title: "Feedback detail",
};

export default function FeedbackDetailRoute(): ReactElement {
  return (
    <FeedbackErrorBoundary>
      <React.Suspense
        fallback={
          <div className="mx-auto max-w-3xl px-4 py-8">
            <DetailSkeleton />
          </div>
        }
      >
        <FeedbackDetailProvider>
          <FeedbackDetailPanel />
        </FeedbackDetailProvider>
      </React.Suspense>
    </FeedbackErrorBoundary>
  );
}
