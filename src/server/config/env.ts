import { z } from "zod";

export const aiProviderSchema = z.enum(["openai", "mock"]);
export type AiProviderValue = z.infer<typeof aiProviderSchema>;

export const logProviderSchema = z.enum(["pino", "noop"]);
export type LogProviderValue = z.infer<typeof logProviderSchema>;

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().optional().default(""),
    AI_PROVIDER: aiProviderSchema.default("mock"),
    OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
    LOG_LEVEL: z.string().default("info"),
    LOG_PROVIDER: logProviderSchema.default("pino"),
  })
  .refine(
    (v) =>
      v.AI_PROVIDER !== "openai" || v.OPENAI_API_KEY.trim() !== "",
    {
      message: "OPENAI_API_KEY is required when AI_PROVIDER=openai",
      path: ["OPENAI_API_KEY"],
    },
  );

export type ParsedEnv = z.infer<typeof envSchema>;

/**
 * Validates process env subset used by adapters and DAO wiring only.
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
  };

  const parsed = envSchema.safeParse(trimmed);
  if (!parsed.success) {
    const msgs = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid environment: ${msgs}`);
  }

  return parsed.data;
}
