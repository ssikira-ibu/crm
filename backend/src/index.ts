import { config } from "./config.js";
import app from "./app.js";

app.listen(config.PORT, () => {
  console.log(`CRM backend running on port ${config.PORT} [${config.NODE_ENV}]`);
});
