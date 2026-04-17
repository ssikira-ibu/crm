import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  S2S_JWT_SECRET: z.string().min(32),
});

export const config = envSchema.parse(process.env);
