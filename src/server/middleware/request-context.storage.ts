import { AsyncLocalStorage } from "node:async_hooks";

import type { ILogger } from "@/server/ports/logger.port";

export interface RequestExecutionContext {
  requestId: string;
  logger: ILogger;
  startedNs: bigint;
}

const storage = new AsyncLocalStorage<RequestExecutionContext>();

export function getRequestExecutionContext(): RequestExecutionContext | undefined {
  return storage.getStore();
}

export function runWithRequestContext<TResult>(
  ctx: RequestExecutionContext,
  fn: () => TResult | Promise<TResult>,
): Promise<TResult> | TResult {
  return storage.run(ctx, fn);
}
