import Router from "@koa/router";
import healthRouter from "./health.js";
import dashboardRoutes from "./dashboard.js";
import customerRoutes from "./customers.js";
import contactRoutes from "./contacts.js";
import addressRoutes from "./addresses.js";
import phoneNumberRoutes from "./phoneNumbers.js";
import noteRoutes from "./notes.js";
import reminderRoutes from "./reminders.js";

const apiRouter = new Router({ prefix: "/api" });

apiRouter.use(
  dashboardRoutes.routes(),
  dashboardRoutes.allowedMethods(),
);
apiRouter.use(
  customerRoutes.routes(),
  customerRoutes.allowedMethods(),
);
apiRouter.use(
  contactRoutes.routes(),
  contactRoutes.allowedMethods(),
);
apiRouter.use(
  addressRoutes.routes(),
  addressRoutes.allowedMethods(),
);
apiRouter.use(
  phoneNumberRoutes.routes(),
  phoneNumberRoutes.allowedMethods(),
);
apiRouter.use(
  noteRoutes.routes(),
  noteRoutes.allowedMethods(),
);
apiRouter.use(
  reminderRoutes.routes(),
  reminderRoutes.allowedMethods(),
);

export { healthRouter, apiRouter };
