import pino from "pino";
import type { Logger as PinoLogger } from "pino";

import type { ILogger } from "@/server/ports/logger.port";

class PinoLoggerAdapter implements ILogger {
  constructor(private readonly backend: PinoLogger) {}

  child(bindings: Record<string, unknown>): ILogger {
    return new PinoLoggerAdapter(this.backend.child(bindings));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (meta === undefined) {
      this.backend.info(message);
    }
    else {
      this.backend.info(meta, message);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (meta === undefined) {
      this.backend.warn(message);
    }
    else {
      this.backend.warn(meta, message);
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (meta === undefined) {
      this.backend.error(message);
    }
    else {
      this.backend.error(meta, message);
    }
  }
}

const PINO_LEVELS = new Set<string>([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

function normalizeLevel(level: string): string {
  return PINO_LEVELS.has(level) ? level : "info";
}

export function createPinoLogger(level: string): ILogger {
  const backend = pino({
    level: normalizeLevel(level),
  });

  return new PinoLoggerAdapter(backend);
}
