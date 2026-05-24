import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisExecutionError } from "@/server/models/analysis-execution-error";
import { noopLoggerAdapter } from "@/server/adapters/noop-logger.adapter";
import { OpenAIAnalysisAdapter } from "@/server/adapters/openai-analysis.adapter";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  class MockRateLimitError extends Error {
    status = 429;
  }

  class MockAPIConnectionError extends Error {}

  class MockInternalServerError extends Error {
    status = 500;
  }

  class MockAPIError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  class OpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };

    constructor(_opts: { apiKey: string }) {}
  }

  return {
    OpenAI,
    RateLimitError: MockRateLimitError,
    APIConnectionError: MockAPIConnectionError,
    InternalServerError: MockInternalServerError,
    APIError: MockAPIError,
    APIConnectionTimeoutError: MockAPIConnectionError,
  };
});

const validAnalysisJson = JSON.stringify({
  summary: "User reports slow checkout.",
  sentiment: "negative",
  tags: ["checkout", "performance"],
  priority: "P1",
  nextAction: "Profile payment API latency.",
});

function completionWithContent(content: string | null) {
  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}

describe("OpenAIAnalysisAdapter", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    vi.useRealTimers();
  });

  it("parses and validates a well-formed JSON model response", async () => {
    mockCreate.mockResolvedValueOnce(
      completionWithContent(validAnalysisJson),
    );

    const adapter = new OpenAIAnalysisAdapter(
      "test-key",
      "gpt-4o-mini",
      noopLoggerAdapter,
    );

    const result = await adapter.analyze("Checkout is very slow.");

    expect(result.summary).toBe("User reports slow checkout.");
    expect(result.sentiment).toBe("negative");
    expect(result.tags).toEqual(["checkout", "performance"]);
    expect(result.priority).toBe("P1");
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });
  });

  it("throws AnalysisExecutionError on malformed JSON", async () => {
    mockCreate.mockResolvedValueOnce(
      completionWithContent("not-json"),
    );

    const adapter = new OpenAIAnalysisAdapter(
      "test-key",
      "gpt-4o-mini",
      noopLoggerAdapter,
    );

    await expect(adapter.analyze("hello")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AnalysisExecutionError
        && /Malformed JSON/i.test(err.message),
    );
  });

  it("throws when model JSON fails Zod validation", async () => {
    mockCreate.mockResolvedValue(
      completionWithContent(
        JSON.stringify({
          summary: "x",
          sentiment: "angry",
          tags: [],
          priority: "P9",
          nextAction: "y",
        }),
      ),
    );

    const adapter = new OpenAIAnalysisAdapter(
      "test-key",
      "gpt-4o-mini",
      noopLoggerAdapter,
    );

    await expect(adapter.analyze("bad shape")).rejects.toThrow(
      /validation/i,
    );
  });

  it("retries transient rate limits then succeeds", async () => {
    const { RateLimitError } = await import("openai");

    mockCreate
      .mockRejectedValueOnce(new RateLimitError(429, undefined, undefined, undefined))
      .mockResolvedValueOnce(completionWithContent(validAnalysisJson));

    vi.useFakeTimers();

    const adapter = new OpenAIAnalysisAdapter(
      "test-key",
      "gpt-4o-mini",
      noopLoggerAdapter,
    );

    const pending = adapter.analyze("retry me");

    await vi.runAllTimersAsync();

    const result = await pending;

    expect(result.priority).toBe("P1");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
