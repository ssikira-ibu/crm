import "server-only";
import { z } from "zod";

export const serverEnv = z
  .object({
    SESSION_SECRET: z.string().min(32),
    S2S_JWT_SECRET: z.string().min(32),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
    AGENT_URL: z.string().default("http://localhost:3002"),
  })
  .refine(
    (env) =>
      Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
      Boolean(env.GOOGLE_APPLICATION_CREDENTIALS),
    {
      message:
        "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS",
      path: ["FIREBASE_SERVICE_ACCOUNT_JSON"],
    },
  )
  .parse(process.env);
