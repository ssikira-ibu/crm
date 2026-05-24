import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import app from "./app.js";
import { startWorker, stopWorker } from "./worker/index.js";

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "CRM backend started");
  void startWorker();
});

const shutdown = () => {
  stopWorker();
  setTimeout(() => process.exit(0), 500);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
