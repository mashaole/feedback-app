import {
  InMemoryAnalysisCacheAdapter,
} from "@/server/adapters/in-memory-analysis-cache.adapter";
import {
  MockAnalysisAdapter,
} from "@/server/adapters/mock-analysis.adapter";
import {
  OpenAIAnalysisAdapter,
} from "@/server/adapters/openai-analysis.adapter";
import {
  noopLoggerAdapter,
} from "@/server/adapters/noop-logger.adapter";
import {
  createPinoLogger,
} from "@/server/adapters/pino-logger.adapter";
import type { ParsedEnv } from "@/server/config/env";
import { loadEnv } from "@/server/config/env";
import { FeedbackDao } from "@/server/dao/feedback-dao";
import { getPgPool } from "@/server/dao/pg-pool";
import type { IAnalysisPort } from "@/server/ports/analysis.port";
import type { ILogger } from "@/server/ports/logger.port";
import {
  FeedbackService,
} from "@/server/services/feedback.service";

/**
 * Sole composition root: binds env → DAO + adapters → FeedbackService.
 */

export interface ApplicationContainer {
  env: ParsedEnv;

  feedbackService: FeedbackService;

  logger: ILogger;
}

function createLoggerFromEnv(parsed: ParsedEnv): ILogger {
  if (parsed.LOG_PROVIDER === "noop") {
    return noopLoggerAdapter;
  }
  return createPinoLogger(parsed.LOG_LEVEL);
}

function createAnalysisFromEnv(
  parsed: ParsedEnv,
  logger: ILogger,
): IAnalysisPort {
  if (parsed.AI_PROVIDER === "mock") {
    return new MockAnalysisAdapter();
  }

  return new OpenAIAnalysisAdapter(
    parsed.OPENAI_API_KEY,
    parsed.OPENAI_MODEL,
    logger,
  );
}

export function createContainer(
  envSource: Record<string, string | undefined> = process.env,
): ApplicationContainer {
  const parsedEnv = loadEnv(envSource);

  const logger = createLoggerFromEnv(parsedEnv);
  const repo = new FeedbackDao(getPgPool(parsedEnv.DATABASE_URL), logger);
  const analysis = createAnalysisFromEnv(parsedEnv, logger);
  const cache = new InMemoryAnalysisCacheAdapter();

  const feedbackService = new FeedbackService(
    repo,
    analysis,
    cache,
    logger,
  );

  return { env: parsedEnv, feedbackService, logger };
}

let singleton: ApplicationContainer | null = null;

export function getApplicationContainer(): ApplicationContainer {
  singleton ??= createContainer();
  return singleton;
}
