import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  InternalServerError,
  OpenAI,
  RateLimitError,
} from "openai";

import type { FeedbackAnalysis } from "@/server/models";
import { AnalysisExecutionError } from "@/server/models/analysis-execution-error";
import type { IAnalysisPort } from "@/server/ports/analysis.port";
import type { ILogger } from "@/server/ports/logger.port";
import { feedbackAnalysisSchema } from "@/server/validation/feedback-analysis.schema";
import { ZodError } from "zod";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTransientOpenAIStatus(status: number | undefined): boolean {
  if (status === undefined) {
    return false;
  }
  if (status === 429) {
    return true;
  }
  return status >= 500 && status !== 501;
}

function retryDelayMsForAttempt(attempt: number): number {
  const fallback = 2500 * attempt + 250;
  const tableMs = [200, 700, 2000][attempt];
  return tableMs === undefined ? fallback : tableMs;
}

function isRetryableOpenAIErr(err: unknown): boolean {
  return (
    err instanceof RateLimitError
    || err instanceof InternalServerError
    || err instanceof APIConnectionError
    || (err instanceof APIError
      && isTransientOpenAIStatus(err.status ?? undefined))
  );
}

const SYSTEM_PROMPT = [
  "You triage internal customer feedback for an engineering backlog.",
  "Reply with a single JSON object only (JSON mode):",
  "Keys: summary (string under 600 words), sentiment (positive|neutral|negative),",
  "tags (1-5 lowercase single-word-ish labels; hyphen OK), priority (P0|P1|P2|P3),",
  "nextAction (one actionable string).",
].join(" ");

const ATTEMPTS = 3;

function analysisErrorStages(err: unknown): string[] {
  const msgs: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; depth < 8; depth += 1) {
    if (!(cur instanceof AnalysisExecutionError)) {
      break;
    }

    msgs.push(cur.message);

    const nextCause = cur.causeUnknown;

    if (nextCause !== undefined && nextCause !== null) {
      cur = nextCause;
      continue;
    }

    break;
  }

  return msgs;
}

function leafWrappedCause(root: AnalysisExecutionError): unknown {
  let cur: unknown = root;

  for (let depth = 0; depth < 8; depth += 1) {
    if (!(cur instanceof AnalysisExecutionError)) {
      return cur;
    }

    const next = cur.causeUnknown;

    if (next !== undefined && next !== null && next instanceof AnalysisExecutionError) {
      cur = next;
      continue;
    }

    return next;
  }

  return cur instanceof AnalysisExecutionError ? cur.causeUnknown : cur;
}

/** Safe fields only (no API keys); helps diagnose 502s in logs. */
function openAiLeafDiagnostics(leaf: unknown): Record<string, unknown> {
  if (leaf instanceof APIConnectionTimeoutError) {
    return {
      failure_kind: "openai_connection_timeout",
      terminal_message: leaf.message,
    };
  }

  if (leaf instanceof APIConnectionError) {
    return {
      failure_kind: "openai_connection",
      terminal_message: leaf.message,
    };
  }

  if (
    leaf instanceof APIError
    && typeof leaf.status === "number"
  ) {
    const bodyError = leaf.error;
    let openai_detail: Record<string, unknown> | undefined;

    if (
      typeof bodyError === "object"
      && bodyError !== null
      && typeof (bodyError as { message?: unknown }).message === "string"
    ) {
      const m = bodyError as { message: string };
      openai_detail = { message: m.message };
      const ct = (bodyError as { code?: unknown }).code;

      if (typeof ct === "string") {
        openai_detail.code = ct;
      }
    }

    return {
      failure_kind:
        leaf instanceof RateLimitError
          ? "openai_rate_limit"
          : leaf instanceof InternalServerError
            ? "openai_upstream_5xx"
            : leaf.status === 401
              ? "openai_authentication"
              : "openai_http_error",
      openai_http_status: leaf.status,
      openai_code: leaf.code ?? null,
      openai_type: leaf.type ?? null,
      openai_request_id: leaf.requestID ?? null,
      openai_terminal_message: leaf.message,
      ...(typeof openai_detail !== "undefined" ? { openai_api_error_body: openai_detail } : {}),
    };
  }

  if (leaf instanceof Error) {
    return {
      failure_kind: "generic_error",
      error_name: leaf.name,
      terminal_message: leaf.message,
    };
  }

  if (leaf !== undefined && leaf !== null) {
    return { failure_kind: "unknown_throwable", detail: String(leaf) };
  }

  return { failure_kind: "no_leaf_cause" };
}

export class OpenAIAnalysisAdapter implements IAnalysisPort {
  private readonly client: OpenAI;

  private readonly model: string;

  private readonly log: ILogger;

  constructor(apiKey: string, model: string, logger: ILogger) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.log = logger.child({ component: "OpenAIAnalysisAdapter" });
  }

  async analyze(text: string): Promise<FeedbackAnalysis> {
    const started = Date.now();
    try {
      const content = await this.completeJsonContent(text);

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(content);
      } catch {
        throw new AnalysisExecutionError("Malformed JSON from model");
      }

      try {
        const analysis = feedbackAnalysisSchema.parse(parsedJson);
        this.log.info("openai_analysis_finished", {
          model: this.model,
          outcome: "success",
          durationMs: Date.now() - started,
        });
        return analysis;
      } catch (err: unknown) {
        if (err instanceof ZodError) {
          throw new AnalysisExecutionError(
            "Model output failed validation",
          );
        }
        throw err;
      }
    } catch (err: unknown) {
      const failure =
        err instanceof AnalysisExecutionError
          ? err
          : new AnalysisExecutionError("OpenAI adapter failed", err);
      const stages = analysisErrorStages(failure);

      const leaf =
        failure instanceof AnalysisExecutionError
          ? leafWrappedCause(failure)
          : err;

      this.log.warn("openai_analysis_finished", {
        model: this.model,
        outcome: "error",
        durationMs: Date.now() - started,
        analysis_pipeline_stages:
          stages.length > 0 ? stages : failure.message,
        ...openAiLeafDiagnostics(leaf ?? err),
      });
      throw failure;
    }
  }

  private async completeJsonContent(text: string): Promise<string> {
    const userEnvelope = JSON.stringify({
      role: "user_feedback_plaintext_payload",
      text,
    });
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: userEnvelope },
    ];

    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      try {
        const result = await this.client.chat.completions.create({
          model: this.model,
          messages,
          response_format: { type: "json_object" },
        });
        const content = result.choices[0]?.message?.content?.trim();

        if (typeof content !== "string" || content.length === 0) {
          const inner = new Error("Empty assistant content");
          if (!this.shouldRetry(inner, attempt)) {
            throw new AnalysisExecutionError("Empty OpenAI response", inner);
          }
          await sleep(retryDelayMsForAttempt(attempt));
          continue;
        }
        return content;
      } catch (err: unknown) {
        if (err instanceof AnalysisExecutionError) {
          throw err;
        }
        if (!this.shouldRetry(err, attempt)) {
          throw new AnalysisExecutionError("OpenAI request failed", err);
        }
        await sleep(retryDelayMsForAttempt(attempt));
      }
    }

    throw new AnalysisExecutionError("OpenAI retries exhausted");
  }

  private shouldRetry(err: unknown, attempt: number): boolean {
    return attempt < ATTEMPTS - 1 && isRetryableOpenAIErr(err);
  }
}
