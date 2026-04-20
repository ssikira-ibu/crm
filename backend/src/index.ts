import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import app from "./app.js";

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "CRM backend started");
});
