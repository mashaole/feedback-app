"use client";

import type { ApiClientError } from "@/lib/api/api-client-error";
import type { ReactElement } from "react";

interface ErrorAlertProps {
  error: ApiClientError | null | undefined;

  /** Optional concise title above the API message */

  title?: string;
}

export function ErrorAlert({ error, title }: ErrorAlertProps): ReactElement | null {
  if (!error) {
    return null;
  }

  const secondary = [
    error.code && `Code: ${error.code}`,
    error.status && `HTTP ${error.status}`,
    typeof error.retryAfterMs === "number"
      ? `Retry after ${error.retryAfterMs} ms`
      : "",
    error.requestId && `Request ${error.requestId}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="alert"
      className={
        "rounded-lg border border-red-800/55 bg-red-50 p-4 text-sm " +
        "text-red-950 dark:border-red-700 dark:bg-red-950/95 dark:text-red-50"
      }
    >
      {typeof title === "string" ? (
        <div className="font-semibold">{title}</div>
      ) : null}

      <div className={title !== undefined ? "mt-2" : ""}>{error.message}</div>

      {secondary !== "" ? (
        <div className="mt-2 text-xs opacity-90">{secondary}</div>
      ) : null}
    </div>
  );
}
