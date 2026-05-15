import Koa from "koa";
import cors from "@koa/cors";
import { koaBody } from "koa-body";
import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";
import { chatRouter, conversationRouter } from "./routes/chat.js";

const app = new Koa();

app.use(errorHandler);
app.use(cors({ origin: "*", credentials: true }));
app.use(koaBody({ jsonLimit: "256kb" }));

app.use(authMiddleware);
app.use(chatRouter.routes());
app.use(chatRouter.allowedMethods());
app.use(conversationRouter.routes());
app.use(conversationRouter.allowedMethods());

export default app;
