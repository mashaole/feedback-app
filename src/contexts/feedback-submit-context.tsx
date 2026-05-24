"use client";

import type { PropsWithChildren, ReactElement } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  ApiClientError,
  classifyFromStatusAndCode,
} from "@/lib/api/api-client-error";
import { createFeedbackClient } from "@/lib/api/feedback-client";
import type { FeedbackDto } from "@/shared/api/feedback.contract";
import { createFeedbackBodySchema } from "@/shared/validation/feedback.schemas";
import {
  sanitizeFeedbackText,
  sanitizeNullableEmail,
} from "@/shared/validation/sanitize";

export interface FeedbackSubmitState {
  isSubmitting: boolean;
  error: ApiClientError | null;
  fieldErrors: Record<string, string>;
  created: FeedbackDto | null;

  submit: (
    textDraft: string,
    emailDraft: string,
    opts?: { idempotencyKey?: string },
  ) => Promise<void>;
  clearSuccess: () => void;
}

const Ctx = createContext<FeedbackSubmitState | undefined>(undefined);

export function FeedbackSubmitProvider({
  children,
}: PropsWithChildren): ReactElement {
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<FeedbackDto | null>(null);

  const clearSuccess = useCallback(() => {
    setCreated(null);
  }, []);

  const submit = useCallback(async (
    textDraft: string,
    emailDraft: string,
    opts?: { idempotencyKey?: string },

  ) => {
    setError(null);
    setFieldErrors({});

    const emailSanitized =
      emailDraft.trim() === ""
        ? null
        : sanitizeNullableEmail(emailDraft);

    const parsed = createFeedbackBodySchema.safeParse({
      text: sanitizeFeedbackText(textDraft),
      email: emailSanitized ?? undefined,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        next[path === "" ? "text" : path] = issue.message;
      });
      setFieldErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const dto = await createFeedbackClient(
        { text: parsed.data.text, email: parsed.data.email ?? null },
        { idempotencyKey: opts?.idempotencyKey },
      );
      setCreated(dto);
    } catch (e: unknown) {
      const err =
        e instanceof ApiClientError
          ? e
          : new ApiClientError(
              e instanceof Error ? e.message : "Submission failed",
              {
                status: 500,
                category: classifyFromStatusAndCode(500, "INTERNAL_ERROR"),
                code: "INTERNAL_ERROR",
              },
            );
      setError(err);

      const byField: Record<string, string> = {};
      err.details?.forEach((d) => {
        byField[d.field] = d.message;
      });
      if (Object.keys(byField).length > 0) {
        setFieldErrors(byField);
      }
    } finally {
      setSubmitting(false);
    }
  }, []);

  const value = useMemo(
    (): FeedbackSubmitState => ({
      isSubmitting,
      error,
      fieldErrors,
      created,
      submit,
      clearSuccess,
    }),
    [isSubmitting, error, fieldErrors, created, submit, clearSuccess],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFeedbackSubmit(): FeedbackSubmitState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useFeedbackSubmit requires FeedbackSubmitProvider");
  }
  return ctx;
}
