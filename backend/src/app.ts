import Koa from "koa";
import cors from "@koa/cors";
import { koaBody } from "koa-body";
import helmet from "koa-helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { authMiddleware, orgMiddleware } from "./middleware/auth.js";
import { healthRouter, apiRouter, authOnlyRouter } from "./routes/index.js";

const app = new Koa();

// Global middleware
app.use(errorHandler);
app.use(requestLogger);
app.use(helmet());
app.use(cors());
app.use(koaBody());

// Health check (no auth required)
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

// Auth-only routes (no org membership required): org creation, invite acceptance, /me
app.use(authMiddleware);
app.use(authOnlyRouter.routes());
app.use(authOnlyRouter.allowedMethods());

// Org-scoped API routes (require org membership)
app.use(orgMiddleware);
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

export default app;
