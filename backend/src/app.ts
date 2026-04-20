import Koa from "koa";
import cors from "@koa/cors";
import { koaBody } from "koa-body";
import helmet from "koa-helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authMiddleware, orgMiddleware } from "./middleware/auth.js";
import { healthRouter, apiRouter, authOnlyRouter } from "./routes/index.js";
import { config } from "./config.js";
import { globalRateLimit, authRateLimit } from "./middleware/rateLimit.js";

const app = new Koa();

const allowedOrigins = config.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

// Global middleware
app.use(errorHandler);
app.use(requestLogger);
app.use(globalRateLimit);
app.use(
  helmet({
    contentSecurityPolicy: config.NODE_ENV === "production" ? undefined : false,
    strictTransportSecurity:
      config.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
  }),
);
app.use(
  cors({
    origin: (ctx) => {
      const requestOrigin = ctx.get("Origin");
      if (allowedOrigins.includes(requestOrigin)) return requestOrigin;
      return "";
    },
    credentials: true,
  }),
);
app.use(koaBody({ jsonLimit: "1mb", textLimit: "1mb" }));

// Health check (no auth required)
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

// Auth-only routes (no org membership required): org creation, invite acceptance, /me
app.use(authMiddleware);
app.use(authRateLimit);
app.use(authOnlyRouter.routes());
app.use(authOnlyRouter.allowedMethods());

// Org-scoped API routes (require org membership)
app.use(orgMiddleware);
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

export default app;
