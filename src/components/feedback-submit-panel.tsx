"use client";

import Link from "next/link";
import type {
  ChangeEvent,
  FormEvent,
  ReactElement,
} from "react";
import React, { useMemo, useRef, useState } from "react";

import { ErrorAlert } from "@/components/error-alert";
import { Badge } from "@/components/ui/badge";
import { useFeedbackSubmit } from "@/contexts/feedback-submit-context";

/** Client form for homepage submit flow */

export function FeedbackSubmitPanel(): ReactElement {
  const { isSubmitting, error, fieldErrors, created, submit, clearSuccess } =
    useFeedbackSubmit();

  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const [text, setText] = useState("");
  const [email, setEmail] = useState("");

  const canSubmitDisabled = useMemo(
    (): boolean =>
      text.trim().length === 0 || isSubmitting,
    [text, isSubmitting],
  );

  function handleSubmit(ev: FormEvent<HTMLFormElement>): void {
    ev.preventDefault();
    void submit(text, email, {
      idempotencyKey: idempotencyKeyRef.current,
    });
  }

  function handleResetAfterSuccess(): void {
    clearSuccess();
    setText("");
    setEmail("");
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          New feedback
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Paste feedback text for AI triage. Email is optional and not unique.
        </p>
      </div>

      <ErrorAlert title="Submission failed" error={error} />

      {created ? (
        <div
          className={
            "space-y-3 rounded-xl border border-emerald-800/55 " +
            "bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-700 " +
            "dark:bg-emerald-950/90 dark:text-emerald-50"
          }
          role="status"
        >
          <div className="font-semibold">Saved and analyzed</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>#{created.id}</span>
            <Badge kind="sentiment" value={created.sentiment} />
            <Badge kind="priority" value={created.priority} />
          </div>
          <Link
            className={
              "text-sm font-medium underline underline-offset-2 " +
              "dark:text-emerald-200"
            }
            href={`/feedback/${encodeURIComponent(String(created.id))}`}
          >
            View detail
          </Link>

          <div>
            <button
              type="button"
              className={
                "mt-1 rounded-full border border-current px-4 py-2 " +
                "text-sm dark:border-emerald-200"
              }
              onClick={handleResetAfterSuccess}
            >
              Submit another
            </button>
          </div>
        </div>
      ) : null}

      {!created ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Feedback</span>

            <textarea
              disabled={isSubmitting}
              className={
                "min-h-[132px] rounded-lg border px-3 py-2 dark:border-zinc-700 " +
                "dark:bg-zinc-900"
              }
              value={text}
              onChange={(ev: ChangeEvent<HTMLTextAreaElement>): void => {
                setText(ev.target.value);
              }}
              required
              name="text"
              aria-invalid={fieldErrors.text ? true : false}
              aria-describedby={fieldErrors.text ? "err-text" : undefined}
            />

            {fieldErrors.text ? (
              <span id="err-text" role="alert" className="text-sm text-red-600">
                {fieldErrors.text}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email (optional)</span>

            <input
              disabled={isSubmitting}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev: ChangeEvent<HTMLInputElement>): void => {
                setEmail(ev.target.value);
              }}
              className={
                "rounded-lg border px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              }
              aria-invalid={fieldErrors.email ? true : false}
              aria-describedby={fieldErrors.email ? "err-email" : undefined}
            />

            {fieldErrors.email ? (
              <span id="err-email" role="alert" className="text-sm text-red-600">
                {fieldErrors.email}
              </span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={canSubmitDisabled}
            className={
              "rounded-full bg-zinc-900 px-5 py-2.5 font-medium text-white " +
              "disabled:opacity-50 dark:bg-white dark:text-zinc-950"
            }
          >
            {isSubmitting ? "Submitting…" : "Analyze feedback"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
