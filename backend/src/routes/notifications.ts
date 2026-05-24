import Router from "@koa/router";
import { PassThrough } from "node:stream";
import { validate } from "../middleware/validate.js";
import {
  notificationQuerySchema,
  type NotificationQueryParams,
} from "@crm/shared";
import * as notificationService from "../services/notification.service.js";
import { subscribeNotifications } from "../lib/notificationBus.js";
import { getOrgContext } from "../lib/orgContext.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

router.get(
  "/notifications",
  validate(notificationQuerySchema, "query"),
  async (ctx) => {
    const result = await notificationService.listNotifications(
      getOrgContext(ctx.state.user),
      ctx.state.query as NotificationQueryParams,
    );
    ctx.body = result;
  },
);

router.post("/notifications/:id/read", async (ctx) => {
  const notification = await notificationService.markRead(
    getOrgContext(ctx.state.user),
    ctx.params.id,
  );
  ctx.body = { data: notification };
});

router.post("/notifications/read-all", async (ctx) => {
  await notificationService.markAllRead(getOrgContext(ctx.state.user));
  ctx.status = 204;
});

// Server-sent events stream for live notifications. The frontend BFF
// proxies this so the browser holds a long-lived connection through
// Next.js, which then talks to the backend over the internal network.
router.get("/notifications/stream", async (ctx) => {
  const { userId } = getOrgContext(ctx.state.user);
  const stream = new PassThrough();
  ctx.type = "text/event-stream";
  ctx.set("Cache-Control", "no-cache, no-transform");
  ctx.set("Connection", "keep-alive");
  ctx.set("X-Accel-Buffering", "no");
  ctx.body = stream;

  stream.write(`event: hello\ndata: ${JSON.stringify({ userId })}\n\n`);

  const unsubscribe = subscribeNotifications(userId, (payload) => {
    stream.write(
      `event: notification\ndata: ${JSON.stringify(payload)}\n\n`,
    );
  });

  const heartbeat = setInterval(() => {
    stream.write(`: ping\n\n`);
  }, 25_000);

  ctx.req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    stream.end();
  });
});

export default router;
