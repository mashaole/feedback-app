"use client";

import type { PropsWithChildren } from "react";
import React, { Component, type ErrorInfo } from "react";

interface FeedbackErrorBoundaryState {
  hasError: boolean;
}

export class FeedbackErrorBoundary extends Component<
  PropsWithChildren,
  FeedbackErrorBoundaryState
> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): FeedbackErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    void info;
    console.error("[FeedbackErrorBoundary]", err.message);
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="rounded-lg border border-red-700/70 bg-red-300/55 p-4 text-sm dark:border-red-900 dark:bg-red-950/95 dark:text-white"
      >
        <div className="font-semibold">Something went wrong in this panel.</div>

        <button
          type="button"
          className="mt-3 rounded-full bg-neutral-950 px-4 py-2 text-neutral-50 dark:bg-white dark:text-black"
          onClick={this.handleRetry}
        >
          Try again
        </button>
      </div>
    );
  }
}
