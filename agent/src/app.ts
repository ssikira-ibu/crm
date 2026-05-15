import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import { koaBody } from "koa-body";
import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";
import { chatRouter, conversationRouter } from "./routes/chat.js";

const app = new Koa();

app.use(errorHandler);
app.use(cors({ origin: "*", credentials: true }));
app.use(koaBody({ jsonLimit: "256kb" }));

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
