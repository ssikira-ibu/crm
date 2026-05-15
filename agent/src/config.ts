import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  S2S_JWT_SECRET: z.string().min(32),
  BACKEND_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().min(1),
  // Valid IDs: claude-sonnet-4-6, claude-opus-4-7, claude-haiku-4-5-20251001.
  DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  MAX_TURNS: z.coerce.number().int().positive().default(8),
  MAX_TOOL_CALLS: z.coerce.number().int().positive().default(15),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(4096),
});

export const config = envSchema.parse(process.env);
