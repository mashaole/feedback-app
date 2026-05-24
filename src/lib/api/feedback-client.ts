"use client";

import type {
  CreateFeedbackRequestBody,
  FeedbackDto,
  PaginatedFeedbackListDto,
} from "@/shared/api/feedback.contract";

import {
  ApiClientError,
} from "@/lib/api/api-client-error";

function serverBase(): string {
  const raw =
    typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string"
      ? process.env.NEXT_PUBLIC_API_BASE_URL.trim().replace(/\/$/, "")
      : "";

  if (raw !== "") {
    return raw;
  }

  /** Same-origin SSR / client hydration fallback */

  return typeof window !== "undefined"
    ? window.location.origin.replace(/\/$/, "")
    : "";
}

async function unwrapJson<TResult>(res: Response): Promise<TResult> {
  if (!res.ok) {
    throw await ApiClientError.fromResponse(res);
  }

  return res.json() as Promise<TResult>;
}

export async function createFeedbackClient(
  body: CreateFeedbackRequestBody,
  opts?: { idempotencyKey?: string },
): Promise<FeedbackDto> {
  const base = serverBase();

  const trimmedKey =
    typeof opts?.idempotencyKey === "string"
      ? opts.idempotencyKey.trim()
      : "";

  const res = await fetch(`${base}/api/feedback`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(trimmedKey !== "" ? { "Idempotency-Key": trimmedKey } : {}),
    },
    body: JSON.stringify({
      text: body.text,
      email: body.email ?? null,
    }),
  });

  return unwrapJson<FeedbackDto>(res);
}

export async function listFeedbackClient(
  search: URLSearchParams,
): Promise<PaginatedFeedbackListDto> {
  const base = serverBase();

  const qsBuilt = search.toString();
  const pathSuffix = qsBuilt === "" ? "" : `?${qsBuilt}`;

  const res = await fetch(`${base}/api/feedback${pathSuffix}`, {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });

  return unwrapJson<PaginatedFeedbackListDto>(res);
}

export async function getFeedbackById(id: number): Promise<FeedbackDto> {
  const base = serverBase();

  const res = await fetch(`${base}/api/feedback/${encodeURIComponent(String(id))}`, {
    method: "GET",
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });

  return unwrapJson<FeedbackDto>(res);
}
