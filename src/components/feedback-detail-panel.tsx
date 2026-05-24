"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import React from "react";

import { DetailSkeleton } from "@/components/detail-skeleton";
import { ErrorAlert } from "@/components/error-alert";
import { TagList } from "@/components/tag-list";
import { Badge } from "@/components/ui/badge";
import { useFeedbackDetail } from "@/contexts/feedback-detail-context";

export function FeedbackDetailPanel(): ReactElement {
  const { isLoading, error, item, reload } = useFeedbackDetail();

  if (isLoading && !item) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <DetailSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/feedback"
          className="text-sm font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-400"
        >
          ← Back to list
        </Link>

        <button
          type="button"
          className={
            "rounded-full border px-4 py-1.5 text-sm dark:border-zinc-700"
          }
          onClick={reload}
          disabled={isLoading === true && item !== null}
        >
          {isLoading === true ? "Refreshing…" : "Reload"}
        </button>
      </div>

      <ErrorAlert title="Feedback unavailable" error={error} />

      {item !== null ? (
        <article className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Feedback #{String(item.id)}
            </h1>

            <p className="text-xs text-zinc-500">{item.createdAt}</p>

            <div className="flex flex-wrap gap-3">
              <Badge kind="sentiment" value={item.sentiment} />
              <Badge kind="priority" value={item.priority} />
              {typeof item.email === "string" && item.email.trim() !== "" ? (
                <span className="text-sm dark:text-zinc-300">{item.email}</span>
              ) : (
                <span className="text-sm italic text-zinc-500 dark:text-zinc-400">
                  No email captured
                </span>
              )}
            </div>
          </header>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide dark:text-zinc-300">
              Original feedback
            </h2>

            <p className="whitespace-pre-wrap rounded-xl border px-5 py-4 text-sm dark:border-zinc-800">
              {item.text}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide dark:text-zinc-300">
              AI summary
            </h2>

            <p className="rounded-xl border px-5 py-4 text-sm leading-relaxed dark:border-zinc-800">
              {item.summary}
            </p>

            <div className="pt-3">
              <TagList ariaLabel="Analysis tags" labels={item.tags} />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide dark:text-zinc-300">
              Suggested action
            </h2>

            <p className="rounded-xl border px-5 py-4 text-sm dark:border-zinc-800">
              {item.nextAction}
            </p>
          </section>
        </article>
      ) : null}
    </div>
  );
}
