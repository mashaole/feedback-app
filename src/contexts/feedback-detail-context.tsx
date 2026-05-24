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
import { useParams } from "next/navigation";

import {
  ApiClientError,
  classifyFromStatusAndCode,
} from "@/lib/api/api-client-error";
import { getFeedbackById } from "@/lib/api/feedback-client";
import type { FeedbackDto } from "@/shared/api/feedback.contract";

export interface FeedbackDetailContextState {
  isLoading: boolean;
  error: ApiClientError | null;
  item: FeedbackDto | null;

  reload: () => void;
}

const DetailCx = createContext<FeedbackDetailContextState | undefined>(
  undefined,
);

function parseId(raw: unknown): number | null {
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function FeedbackDetailProvider({
  children,
}: PropsWithChildren): ReactElement {
  const params = useParams();
  const id = parseId(params?.id);

  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<ApiClientError | null>(null);
  const [item, setItem] = useState<FeedbackDto | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (id === null) {
      setItem(null);
      setError(
        new ApiClientError("Invalid feedback id.", {
          status: 400,
          category: classifyFromStatusAndCode(400, "INVALID_ID"),
          code: "INVALID_ID",
        }),
      );
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const dto = await getFeedbackById(id);
        if (!cancelled) {
          setItem(dto);
        }
      } catch (e: unknown) {
        setItem(null);
        if (!cancelled) {
          const err =
            e instanceof ApiClientError
              ? e
              : new ApiClientError(
                  e instanceof Error ? e.message : "Failed to load item",
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
  }, [id, reloadNonce]);

  const reload = useCallback((): void => {
    setReloadNonce((n) => n + 1);
  }, []);

  const value = useMemo(
    (): FeedbackDetailContextState => ({
      isLoading: loading,
      error,
      item,
      reload,
    }),
    [loading, error, item, reload],
  );

  return <DetailCx.Provider value={value}>{children}</DetailCx.Provider>;
}

export function useFeedbackDetail(): FeedbackDetailContextState {
  const ctx = useContext(DetailCx);
  if (!ctx) {
    throw new Error("useFeedbackDetail requires FeedbackDetailProvider");
  }
  return ctx;
}
