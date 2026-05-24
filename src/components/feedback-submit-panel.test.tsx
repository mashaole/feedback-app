/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedbackSubmitPanel } from "@/components/feedback-submit-panel";
import type { FeedbackSubmitState } from "@/contexts/feedback-submit-context";

const mockSubmit = vi.fn();
const mockClearSuccess = vi.fn();

function mockUseFeedbackSubmit(
  overrides: Partial<FeedbackSubmitState> = {},
): FeedbackSubmitState {
  return {
    isSubmitting: false,
    error: null,
    fieldErrors: {},
    created: null,
    submit: mockSubmit,
    clearSuccess: mockClearSuccess,
    ...overrides,
  };
}

vi.mock("@/contexts/feedback-submit-context", () => ({
  useFeedbackSubmit: vi.fn(() => mockUseFeedbackSubmit()),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { useFeedbackSubmit } from "@/contexts/feedback-submit-context";

describe("FeedbackSubmitPanel", () => {
  afterEach(() => {
    cleanup();
    mockSubmit.mockReset();
    vi.mocked(useFeedbackSubmit).mockImplementation(() =>
      mockUseFeedbackSubmit(),
    );
  });

  it("disables submit when feedback text is empty", () => {
    render(<FeedbackSubmitPanel />);

    const button = screen.getByRole("button", { name: /analyze feedback/i });
    expect(button).toBeDisabled();
  });

  it("calls submit with trimmed text when form is valid", () => {
    render(<FeedbackSubmitPanel />);

    fireEvent.change(screen.getByRole("textbox", { name: /feedback/i }), {
      target: { value: "  Checkout failed twice  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze feedback/i }));

    expect(mockSubmit).toHaveBeenCalledWith(
      "  Checkout failed twice  ",
      "",
      expect.objectContaining({
        idempotencyKey: expect.any(String),
      }),
    );
  });

  it("shows field-level validation message for text", () => {
    vi.mocked(useFeedbackSubmit).mockImplementation(() =>
      mockUseFeedbackSubmit({
        fieldErrors: { text: "Feedback text is required" },
      }),
    );

    render(<FeedbackSubmitPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Feedback text is required",
    );
    expect(screen.getByRole("textbox", { name: /feedback/i })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows loading label while submitting", () => {
    vi.mocked(useFeedbackSubmit).mockImplementation(() =>
      mockUseFeedbackSubmit({ isSubmitting: true }),
    );

    render(<FeedbackSubmitPanel />);

    expect(
      screen.getByRole("button", { name: /submitting/i }),
    ).toBeDisabled();
  });
});
