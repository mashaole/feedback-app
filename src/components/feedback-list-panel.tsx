"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import React, { useCallback, useEffect, useState } from "react";

import { ErrorAlert } from "@/components/error-alert";
import { ListSkeleton } from "@/components/list-skeleton";
import { TagList } from "@/components/tag-list";
import { Badge } from "@/components/ui/badge";
import type { FeedbackDto } from "@/shared/api/feedback.contract";
import { useFeedbackList } from "@/contexts/feedback-list-context";

function shorten(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}

function formatCreatedAt(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Table client bound to FeedbackListProvider + URL filters */

export function FeedbackListPanel(): ReactElement {
  const { isLoading, error, payload, filters, mutateQuery, reload } =
    useFeedbackList();

  function applySentiment(value: string): void {
    const nextSentiment = value === "any" ? "" : value;
    mutateQuery({ sentiment: nextSentiment, page: "1" });
  }

  function applyTag(value: string): void {
    mutateQuery({ tag: value.trim(), page: "1" });
  }

  const pageBack = useCallback(() => {
    const n = filters.page <= 1 ? 1 : filters.page - 1;
    mutateQuery({ page: String(n) });
  }, [filters.page, mutateQuery]);

  const pageForward = useCallback(() => {
    mutateQuery({ page: String(filters.page + 1) });
  }, [filters.page, mutateQuery]);

  if (isLoading && !payload) {
    return (
      <>
        <ListFiltersBar
          filters={filters}
          onSentimentChange={applySentiment}
          onApplyTag={(v: string) => applyTag(v)}
          onReload={reload}
          disabledControls
        />
        <div className="mt-8">
          <ListSkeleton />
        </div>
      </>
    );
  }
  const rows = payload?.items ?? [];

  const showPager =
    !error &&
    payload !== null &&
    typeof payload.total === "number" &&
    typeof payload.pageSize === "number" &&
    payload.pageSize > 0 &&
    payload.total > payload.pageSize;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Feedback inbox
        </h1>

        <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Filter by sentiment and tag marker. Rows open the persisted record +
          cached analysis.
        </p>
      </div>

      <ListFiltersBar
        filters={filters}
        onSentimentChange={applySentiment}
        onApplyTag={(value: string) => applyTag(value)}
        onReload={reload}
        disabledControls={isLoading}
      />

      <ErrorAlert title="List failed to load" error={error} />

      {payload && !error ? (
        <p aria-live="polite" className="text-xs text-zinc-500">
          Showing{" "}
          {rows.length === 0
            ? 0
            : (payload.page - 1) * payload.pageSize + 1}
          -
          {Math.min(payload.page * payload.pageSize, payload.total)}
          {" "}
          of {payload.total}. Page {payload.page} /{" "}
          {Math.max(
            1,
            Math.ceil(payload.total / Math.max(payload.pageSize, 1)),
          )}
          .
          {isLoading ? " Refreshing…" : ""}
        </p>
      ) : null}

      {rows.length === 0 && payload !== null && !error ? (
        <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm dark:border-zinc-700">
          No rows for these filters yet.
        </p>
      ) : null}

      {rows.length > 0 && !error ? (
        <div className="overflow-auto rounded-xl border bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase dark:bg-zinc-900">
              <tr>
                <th className="whitespace-nowrap px-4 py-2">ID</th>
                <th className="whitespace-nowrap px-4 py-2">Summary</th>
                <th className="whitespace-nowrap px-4 py-2">Sentiment</th>
                <th className="whitespace-nowrap px-4 py-2">Tags</th>
                <th className="whitespace-nowrap px-4 py-2">Priority</th>
                <th className="whitespace-nowrap px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: FeedbackDto) => (
                <tr
                  key={row.id}
                  className={
                    "border-t border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/80"
                  }
                >
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                    <Link
                      className={
                        "text-blue-700 underline underline-offset-2 visited:text-purple-900 dark:text-blue-300"
                      }
                      href={`/feedback/${encodeURIComponent(String(row.id))}`}
                    >
                      #{row.id}
                    </Link>
                  </td>
                  <td className="max-w-md px-4 py-2">
                    <span>{shorten(row.summary, 160)}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge kind="sentiment" value={row.sentiment} />
                  </td>
                  <td className="px-4 py-2">
                    <TagList
                      ariaLabel={`Tags row ${String(row.id)}`}
                      labels={row.tags}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Badge kind="priority" value={row.priority} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <time dateTime={row.createdAt}>
                      {formatCreatedAt(row.createdAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {showPager && payload !== null ? (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            disabled={isLoading || filters.page <= 1}
            className={
              "rounded-full border px-4 py-1.5 text-sm disabled:opacity-45 " +
              "dark:border-zinc-700"
            }
            onClick={pageBack}
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              isLoading ||
              payload.page * payload.pageSize >= payload.total ||
              rows.length === 0
            }
            className={
              "rounded-full border px-4 py-1.5 text-sm disabled:opacity-45 " +
              "dark:border-zinc-700"
            }
            onClick={pageForward}
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}

interface ListFiltersBarProps {

  filters: {
    sentiment: string;
    tag: string;

    page: number;

    pageSize: number;
  };

  onSentimentChange: (sentimentSlug: string) => void;

  onApplyTag: (tagEntered: string) => void;

  onReload: () => void;

  disabledControls?: boolean | undefined;

}

/** Local tag input submits on button or Enter via parent callbacks */

function ListFiltersBar({
  filters,

  onSentimentChange,

  onApplyTag,

  onReload,

  disabledControls = false,
}: ListFiltersBarProps): ReactElement {
  const [isTagFiltersMounted, setIsTagFiltersMounted] = useState(false);

  useEffect((): void => {
    setIsTagFiltersMounted(true);
  }, []);

  function handleTagFilterSubmit(ev: React.FormEvent<HTMLFormElement>): void {
    ev.preventDefault();

    const data = new FormData(ev.currentTarget);
    const tagVal = typeof data.get("tag") === "string" ? data.get("tag") as string : "";

    onApplyTag(tagVal);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="sentiment-filter"
          className="text-xs font-medium uppercase"
        >
          Sentiment
        </label>

        <select
          disabled={disabledControls === true}
          id="sentiment-filter"
          aria-label="Filter inbox by sentiment"
          value={filters.sentiment === "" ? "any" : filters.sentiment}
          className="rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          onChange={(ev): void => {
            if (disabledControls !== true) {
              onSentimentChange(ev.target.value);
            }
          }}
        >
          <option value="any">Any</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>
      </div>

      {/* Mount after hydrate: password-manager extensions mutate inputs/buttons inside
       named forms (e.g. data-dashlane-*) vs SSR HTML and cause hydration warnings. */}
      {isTagFiltersMounted !== true ? (
        <div className="flex gap-3" aria-busy="true">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase">Tag contains</span>
            <div
              aria-hidden={true}
              className={
                "h-[42px] min-w-[12rem] rounded-lg border px-3 py-2 " +
                "dark:border-zinc-700 dark:bg-zinc-900"
              }
            />
          </div>

          <div
            aria-hidden={true}
            className={
              "self-end h-[38px] min-w-[4.75rem] rounded-full border px-5 py-2 " +
              "text-sm dark:border-zinc-700"
            }
          />
        </div>
      ) : (
        <form onSubmit={handleTagFilterSubmit} className="flex gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="tag-q" className="text-xs font-medium uppercase">
              Tag contains
            </label>

            <input
              disabled={disabledControls === true}
              id="tag-q"
              aria-label="Filter inbox by tag substring match"
              placeholder="billing"
              defaultValue={filters.tag}
              className={
                "rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              }
              key={filters.tag}
              type="text"
              name="tag"
            />
          </div>

          <button
            className="self-end rounded-full border px-5 py-2 text-sm dark:border-zinc-700"
            disabled={disabledControls === true}
            type="submit"
          >
            Filter
          </button>
        </form>
      )}

      <button
        disabled={disabledControls === true}
        type="button"
        aria-label="Hard refresh inbox list"
        className={
          "self-start rounded-full border px-5 py-2 text-sm dark:border-zinc-700"
        }
        onClick={onReload}
      >
        Retry fetch
      </button>
    </div>
  );
}
