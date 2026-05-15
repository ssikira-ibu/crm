import Router from "@koa/router";

export const chatRouter = new Router();
export const conversationRouter = new Router();

chatRouter.post("/chat", async (ctx) => {
  ctx.status = 501;
  ctx.body = { error: { code: "NOT_IMPLEMENTED", message: "Chat endpoint not yet implemented" } };
});

conversationRouter.get("/conversations", async (ctx) => {
  ctx.status = 501;
  ctx.body = { error: { code: "NOT_IMPLEMENTED", message: "Conversations endpoint not yet implemented" } };
});
