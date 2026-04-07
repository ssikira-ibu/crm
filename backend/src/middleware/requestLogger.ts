import type { Middleware } from "koa";

export const requestLogger: Middleware = async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(
    `${ctx.method} ${ctx.path} ${ctx.status} ${duration}ms`,
  );
};
