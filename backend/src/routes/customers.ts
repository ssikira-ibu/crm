import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from "../schemas/customer.schema.js";
import * as customerService from "../services/customer.service.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// GET /customers
router.get("/customers", validate(customerQuerySchema, "query"), async (ctx) => {
  const result = await customerService.listCustomers(
    ctx.state.user.uid,
    ctx.state.query as { page: number; limit: number; status?: string; search?: string },
  );
  ctx.body = result;
});

// POST /customers
router.post("/customers", validate(createCustomerSchema, "body"), async (ctx) => {
  const customer = await customerService.createCustomer(
    ctx.state.user.uid,
    ctx.request.body,
  );
  ctx.status = 201;
  ctx.body = { data: customer };
});

// GET /customers/:customerId
router.get("/customers/:customerId", async (ctx) => {
  const customer = await customerService.getCustomer(
    ctx.state.user.uid,
    ctx.params.customerId,
  );
  ctx.body = { data: customer };
});

// PUT /customers/:customerId
router.put(
  "/customers/:customerId",
  validate(updateCustomerSchema, "body"),
  async (ctx) => {
    const customer = await customerService.updateCustomer(
      ctx.state.user.uid,
      ctx.params.customerId,
      ctx.request.body,
    );
    ctx.body = { data: customer };
  },
);

// DELETE /customers/:customerId
router.delete("/customers/:customerId", async (ctx) => {
  await customerService.deleteCustomer(
    ctx.state.user.uid,
    ctx.params.customerId,
  );
  ctx.status = 204;
});

export default router;
