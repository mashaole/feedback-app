/* eslint-disable @typescript-eslint/no-unused-vars -- deliberate no-op sinks */
import type { ILogger } from "@/server/ports/logger.port";

class NoopLoggerAdapter implements ILogger {
  child(bindings: Record<string, unknown>): ILogger {
    return this;
  }

  info(message: string, meta?: Record<string, unknown>): void {}

  warn(message: string, meta?: Record<string, unknown>): void {}

  error(message: string, meta?: Record<string, unknown>): void {}
}

/** Shared quiet logger for Vitest (`LOG_PROVIDER=noop`). */
export const noopLoggerAdapter: ILogger = new NoopLoggerAdapter();
