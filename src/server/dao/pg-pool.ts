import { Pool } from "pg";

const globalPg = globalThis as unknown as {
  __feedbackPgPool?: Pool;
  __feedbackPgPoolUrl?: string;
};

const MAX_POOL_CONNECTIONS = 10;

export function getPgPool(databaseUrl: string): Pool {
  if (globalPg.__feedbackPgPool) {
    if (globalPg.__feedbackPgPoolUrl !== databaseUrl) {
      throw new Error(
        "getPgPool: DATABASE_URL changed; call closePgPool() first.",
      );
    }
    return globalPg.__feedbackPgPool;
  }
  globalPg.__feedbackPgPool = new Pool({
    connectionString: databaseUrl,
    max: MAX_POOL_CONNECTIONS,
  });
  globalPg.__feedbackPgPoolUrl = databaseUrl;
  return globalPg.__feedbackPgPool;
}

export async function closePgPool(): Promise<void> {
  if (globalPg.__feedbackPgPool) {
    await globalPg.__feedbackPgPool.end();
    globalPg.__feedbackPgPool = undefined;
    globalPg.__feedbackPgPoolUrl = undefined;
  }
}
