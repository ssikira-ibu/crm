import Router from "@koa/router";
import { validate } from "../middleware/validate.js";
import {
  createCustomFieldDefinitionSchema,
  updateCustomFieldDefinitionSchema,
  setCustomFieldValueSchema,
} from "@crm/shared";
import type {
  CreateCustomFieldDefinitionInput,
  UpdateCustomFieldDefinitionInput,
  SetCustomFieldValueInput,
  CustomFieldEntity,
} from "@crm/shared";
import { CUSTOM_FIELD_ENTITIES } from "@crm/shared";
import * as customFieldService from "../services/customField.service.js";
import { getOrgContext } from "../lib/orgContext.js";
import { requireRole } from "../middleware/authorize.js";
import { AppError } from "../middleware/errorHandler.js";
import type { AppState } from "../types/index.js";

const router = new Router<AppState>();

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

router.get("/custom-fields/definitions", async (ctx) => {
  const entityType = ctx.query.entityType as CustomFieldEntity | undefined;
  const definitions = await customFieldService.listDefinitions(
    getOrgContext(ctx.state.user),
    entityType,
  );
  ctx.body = { data: definitions };
});

router.post(
  "/custom-fields/definitions",
  validate(createCustomFieldDefinitionSchema, "body"),
  async (ctx) => {
    const definition = await customFieldService.createDefinition(
      getOrgContext(ctx.state.user),
      ctx.state.body as CreateCustomFieldDefinitionInput,
    );
    ctx.status = 201;
    ctx.body = { data: definition };
  },
);

router.patch(
  "/custom-fields/definitions/:definitionId",
  requireRole("ADMIN", "MANAGER"),
  validate(updateCustomFieldDefinitionSchema, "body"),
  async (ctx) => {
    const definition = await customFieldService.updateDefinition(
      getOrgContext(ctx.state.user),
      ctx.params.definitionId,
      ctx.state.body as UpdateCustomFieldDefinitionInput,
    );
    ctx.body = { data: definition };
  },
);

router.delete(
  "/custom-fields/definitions/:definitionId",
  requireRole("ADMIN", "MANAGER"),
  async (ctx) => {
    await customFieldService.deleteDefinition(
      getOrgContext(ctx.state.user),
      ctx.params.definitionId,
    );
    ctx.status = 204;
  },
);

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

function validateEntityType(entityType: string): CustomFieldEntity {
  if (!CUSTOM_FIELD_ENTITIES.includes(entityType as CustomFieldEntity)) {
    throw new AppError(400, "INVALID_ENTITY_TYPE", `Entity type must be one of: ${CUSTOM_FIELD_ENTITIES.join(", ")}`);
  }
  return entityType as CustomFieldEntity;
}

router.get(
  "/custom-fields/:entityType/:entityId/values",
  async (ctx) => {
    const entityType = validateEntityType(ctx.params.entityType);
    const values = await customFieldService.getValues(
      getOrgContext(ctx.state.user),
      entityType,
      ctx.params.entityId,
    );
    ctx.body = { data: values };
  },
);

router.put(
  "/custom-fields/:entityType/:entityId/values/:definitionId",
  validate(setCustomFieldValueSchema, "body"),
  async (ctx) => {
    validateEntityType(ctx.params.entityType);
    const value = await customFieldService.setValue(
      getOrgContext(ctx.state.user),
      ctx.params.definitionId,
      ctx.params.entityId,
      (ctx.state.body as SetCustomFieldValueInput).value,
    );
    ctx.body = { data: value };
  },
);

router.delete(
  "/custom-fields/:entityType/:entityId/values/:definitionId",
  async (ctx) => {
    validateEntityType(ctx.params.entityType);
    await customFieldService.deleteValue(
      getOrgContext(ctx.state.user),
      ctx.params.definitionId,
      ctx.params.entityId,
    );
    ctx.status = 204;
  },
);

export default router;
