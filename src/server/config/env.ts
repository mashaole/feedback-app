import { z } from "zod";

export const aiProviderSchema = z.enum(["openai", "mock"]);
export type AiProviderValue = z.infer<typeof aiProviderSchema>;

export const logProviderSchema = z.enum(["pino", "noop"]);
export type LogProviderValue = z.infer<typeof logProviderSchema>;

function splitOrigins(csv: string): string[] {
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().optional().default(""),
    AI_PROVIDER: aiProviderSchema.default("mock"),
    OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
    LOG_LEVEL: z.string().default("info"),
    LOG_PROVIDER: logProviderSchema.default("pino"),

    NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),

    CORS_ALLOWED_ORIGINS: z.string().default(
      "http://localhost:3000",
    ),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_POST_MAX: z.coerce.number().int().positive().default(10),

    API_KEY: z.string().optional().default(""),
  })
  .refine(
    (v) =>
      v.AI_PROVIDER !== "openai" || v.OPENAI_API_KEY.trim() !== "",
    {
      message: "OPENAI_API_KEY is required when AI_PROVIDER=openai",
      path: ["OPENAI_API_KEY"],
    },
  );

export type ParsedEnv = z.infer<typeof envSchema> & {
  CORS_ORIGIN_LIST: string[];
  API_KEY_TRIMMED: string | null;
};

/**
 * Validates process env subset used by adapters, HTTP middleware, and DAO wiring.
 */

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): ParsedEnv {
  const pick = source as Record<string, string | undefined>;
  const trimmed: Record<string, string | undefined> = {
    DATABASE_URL: pick.DATABASE_URL,
    OPENAI_API_KEY: pick.OPENAI_API_KEY,
    AI_PROVIDER: pick.AI_PROVIDER,
    OPENAI_MODEL: pick.OPENAI_MODEL,
    LOG_LEVEL: pick.LOG_LEVEL,
    LOG_PROVIDER: pick.LOG_PROVIDER,
    NODE_ENV: pick.NODE_ENV,
    CORS_ALLOWED_ORIGINS: pick.CORS_ALLOWED_ORIGINS,
    RATE_LIMIT_WINDOW_MS: pick.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: pick.RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_POST_MAX: pick.RATE_LIMIT_POST_MAX,
    API_KEY: pick.API_KEY,
  };

  const parsed = envSchema.safeParse(trimmed);
  if (!parsed.success) {
    const msgs = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid environment: ${msgs}`);
  }

  const apiKeyTrimmed = parsed.data.API_KEY.trim() === ""
    ? null
    : parsed.data.API_KEY.trim();

  return {
    ...parsed.data,
    CORS_ORIGIN_LIST: splitOrigins(parsed.data.CORS_ALLOWED_ORIGINS),
    API_KEY_TRIMMED: apiKeyTrimmed,
  };
}
