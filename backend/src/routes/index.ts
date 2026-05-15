import Router from "@koa/router";
import healthRouter from "./health.js";
import dashboardRoutes from "./dashboard.js";
import companyRoutes from "./companies.js";
import contactRoutes from "./contacts.js";
import addressRoutes from "./addresses.js";
import phoneNumberRoutes from "./phoneNumbers.js";
import noteRoutes from "./notes.js";
import taskRoutes from "./tasks.js";
import dealRoutes from "./deals.js";
import activityRoutes from "./activities.js";
import tagRoutes from "./tags.js";
import eventRoutes from "./events.js";
import searchRoutes from "./search.js";
import pipelineRoutes from "./pipelines.js";
import customFieldRoutes from "./customFields.js";
import orgAdminRoutes from "./orgAdmin.js";
import meRoutes from "./me.js";
import organizationRoutes from "./organizations.js";
import inviteRoutes from "./invites.js";
import agentRoutes from "./agent.js";

// Auth-only routes (user authenticated but no org membership required)
const authOnlyRouter = new Router({ prefix: "/api" });
authOnlyRouter.use(meRoutes.routes(), meRoutes.allowedMethods());
authOnlyRouter.use(organizationRoutes.routes(), organizationRoutes.allowedMethods());
authOnlyRouter.use(inviteRoutes.routes(), inviteRoutes.allowedMethods());

// Org-scoped routes (require org membership)
const apiRouter = new Router({ prefix: "/api" });

apiRouter.use(
  dashboardRoutes.routes(),
  dashboardRoutes.allowedMethods(),
);
apiRouter.use(
  companyRoutes.routes(),
  companyRoutes.allowedMethods(),
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
  taskRoutes.routes(),
  taskRoutes.allowedMethods(),
);
apiRouter.use(
  dealRoutes.routes(),
  dealRoutes.allowedMethods(),
);
apiRouter.use(
  activityRoutes.routes(),
  activityRoutes.allowedMethods(),
);
apiRouter.use(
  tagRoutes.routes(),
  tagRoutes.allowedMethods(),
);
apiRouter.use(
  eventRoutes.routes(),
  eventRoutes.allowedMethods(),
);
apiRouter.use(
  searchRoutes.routes(),
  searchRoutes.allowedMethods(),
);
apiRouter.use(
  pipelineRoutes.routes(),
  pipelineRoutes.allowedMethods(),
);
apiRouter.use(
  customFieldRoutes.routes(),
  customFieldRoutes.allowedMethods(),
);
apiRouter.use(
  orgAdminRoutes.routes(),
  orgAdminRoutes.allowedMethods(),
);
apiRouter.use(
  agentRoutes.routes(),
  agentRoutes.allowedMethods(),
);

export { healthRouter, apiRouter, authOnlyRouter };
