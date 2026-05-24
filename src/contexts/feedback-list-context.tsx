"use client";

import type { PropsWithChildren, ReactElement } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  ApiClientError,
  classifyFromStatusAndCode,
} from "@/lib/api/api-client-error";
import { listFeedbackClient } from "@/lib/api/feedback-client";
import type { PaginatedFeedbackListDto } from "@/shared/api/feedback.contract";

export type FeedbackListFilters = {
  sentiment: string;
  tag: string;
  page: number;
  pageSize: number;
};

export type FeedbackListQueryPatch = Partial<
  Record<"sentiment" | "tag" | "page" | "pageSize", string>
>;

export interface FeedbackListContextState {
  isLoading: boolean;
  error: ApiClientError | null;
  payload: PaginatedFeedbackListDto | null;
  filters: FeedbackListFilters;
  mutateQuery: (patch: FeedbackListQueryPatch) => void;
  reload: () => void;
}

const FeedbackListCx = createContext<FeedbackListContextState | undefined>(
  undefined,
);

export function FeedbackListProvider({
  children,
}: PropsWithChildren): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qsString = searchParams.toString();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [payload, setPayload] =
    useState<PaginatedFeedbackListDto | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const filters = useMemo((): FeedbackListFilters => {
    const qs = new URLSearchParams(qsString);
    const pageRaw = Number.parseInt(qs.get("page") ?? "1", 10);
    const pageSizeRaw = Number.parseInt(
      qs.get("pageSize") ?? "20",
      10,
    );
    return {
      sentiment: qs.get("sentiment") ?? "",
      tag: qs.get("tag") ?? "",
      page:
        Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
      pageSize:
        Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
          ? pageSizeRaw
          : 20,
    };
  }, [qsString]);

  useEffect(() => {
    let cancelled = false;

    void (async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const qs =
          qsString.trim() !== ""
            ? new URLSearchParams(qsString)
            : new URLSearchParams();
        const data = await listFeedbackClient(qs);
        if (!cancelled) {
          setPayload(data);
        }
      } catch (e: unknown) {
        setPayload(null);
        if (!cancelled) {
          const err =
            e instanceof ApiClientError
              ? e
              : new ApiClientError(
                  e instanceof Error ? e.message : "Failed to load list",
                  {
                    status: 500,
                    category: classifyFromStatusAndCode(
                      500,
                      "INTERNAL_ERROR",
                    ),
                    code: "INTERNAL_ERROR",
                  },
                );
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [qsString, reloadNonce]);

  const mutateQuery = useCallback(
    (patch: FeedbackListQueryPatch): void => {
      const next = new URLSearchParams(Array.from(searchParams.entries()));
      (
        Object.keys(patch) as Array<keyof FeedbackListQueryPatch>
      ).forEach((k) => {
        const v = patch[k];
        if (v === undefined || v === "") {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      });
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const reload = useCallback((): void => {
    setReloadNonce((n) => n + 1);
  }, []);

  const value = useMemo(
    (): FeedbackListContextState => ({
      isLoading: loading,
      error,
      payload,
      filters,
      mutateQuery,
      reload,
    }),
    [loading, error, payload, filters, mutateQuery, reload],
  );

  return (
    <FeedbackListCx.Provider value={value}>{children}</FeedbackListCx.Provider>
  );
}

export function useFeedbackList(): FeedbackListContextState {
  const ctx = useContext(FeedbackListCx);
  if (!ctx) {
    throw new Error("useFeedbackList requires FeedbackListProvider");
  }
  return ctx;
}
