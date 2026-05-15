import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3002),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  S2S_JWT_SECRET: z.string().min(32),
  BACKEND_URL: z.string().default("http://localhost:3000"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DEFAULT_PROVIDER: z
    .enum(["anthropic", "openai"])
    .default("anthropic"),
  DEFAULT_MODEL: z.string().default("claude-sonnet-4-6"),
  MAX_TURNS: z.coerce.number().default(8),
  MAX_TOOL_CALLS: z.coerce.number().default(15),
}).superRefine((env, ctx) => {
  if (env.DEFAULT_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["ANTHROPIC_API_KEY"],
      message: "ANTHROPIC_API_KEY is required when DEFAULT_PROVIDER=anthropic",
    });
  }
  if (env.DEFAULT_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["OPENAI_API_KEY"],
      message: "OPENAI_API_KEY is required when DEFAULT_PROVIDER=openai",
    });
  }
});

export const config = envSchema.parse(process.env);
