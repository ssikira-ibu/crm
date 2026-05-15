import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  S2S_JWT_SECRET: z.string().min(32),
  BACKEND_URL: z.string().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string(),
  OPENAI_API_KEY: z.string().optional(),
  DEFAULT_PROVIDER: z
    .enum(["anthropic", "openai"])
    .default("anthropic"),
  DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  MAX_TURNS: z.coerce.number().default(8),
  MAX_TOOL_CALLS: z.coerce.number().default(15),
});

export const config = envSchema.parse(process.env);
