import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  S2S_JWT_SECRET: z.string().min(32),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3001"),
  REDIS_URL: z.string().optional(),
});

export const config = envSchema.parse(process.env);
