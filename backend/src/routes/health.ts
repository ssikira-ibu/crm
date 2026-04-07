import Router from "@koa/router";

const router = new Router();

router.get("/health", (ctx) => {
  ctx.body = { status: "ok" };
});

export default router;
