import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import { koaBody } from "koa-body";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";
import { chatRouter, conversationRouter } from "./routes/chat.js";

const app = new Koa();

app.use(errorHandler);

// Only the frontend BFF talks to the agent service. In dev we default to
// localhost:3001; in prod CORS_ORIGIN must be configured (comma-separated).
const allowedOrigins = (config.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (ctx) => {
      const origin = ctx.get("Origin");
      if (!origin) return "";
      return allowedOrigins.includes(origin) ? origin : "";
    },
    credentials: true,
  }),
);

app.use(koaBody({ jsonLimit: "256kb" }));

// Public health endpoint (used by Docker/k8s probes); must be before auth.
const healthRouter = new Router();
healthRouter.get("/health", (ctx) => {
  ctx.body = { status: "ok" };
});
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

app.use(authMiddleware);
app.use(chatRouter.routes());
app.use(chatRouter.allowedMethods());
app.use(conversationRouter.routes());
app.use(conversationRouter.allowedMethods());

export default app;
