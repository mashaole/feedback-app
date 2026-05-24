/**
 * Structured logging abstraction (infra adapters implement this).
 */

export interface ILogger {
  child(bindings: Record<string, unknown>): ILogger;

  info(message: string, meta?: Record<string, unknown>): void;

  warn(message: string, meta?: Record<string, unknown>): void;

  error(message: string, meta?: Record<string, unknown>): void;
}
