import type { ReactElement } from "react";
import React, { Suspense } from "react";

import { FeedbackErrorBoundary } from "@/components/feedback-error-boundary";
import { FeedbackListPanel } from "@/components/feedback-list-panel";
import { ListSkeleton } from "@/components/list-skeleton";
import { FeedbackListProvider } from "@/contexts/feedback-list-context";

export default function FeedbackListRoute(): ReactElement {
  return (
    <FeedbackErrorBoundary>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl px-4 py-8">
            <ListSkeleton />
          </div>
        }
      >
        <FeedbackListProvider>
          <FeedbackListPanel />
        </FeedbackListProvider>
      </Suspense>
    </FeedbackErrorBoundary>
  );
}
