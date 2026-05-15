ALTER TABLE "companies" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "contacts" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "addresses" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "phone_numbers" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "pipelines" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "pipeline_stages" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "deals" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "notes" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "tags" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "custom_field_definitions" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "custom_field_values" ADD COLUMN "deleted_at" TIMESTAMP(3);

DROP INDEX IF EXISTS "tags_organization_id_name_key";
DROP INDEX IF EXISTS "custom_field_definitions_organization_id_entity_type_field__key";
DROP INDEX IF EXISTS "custom_field_values_definition_id_entity_id_key";

CREATE UNIQUE INDEX "tags_organization_id_name_active_key"
  ON "tags"("organization_id", "name")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "custom_field_definitions_org_entity_field_active_key"
  ON "custom_field_definitions"("organization_id", "entity_type", "field_key")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "custom_field_values_definition_entity_active_key"
  ON "custom_field_values"("definition_id", "entity_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "companies_organization_id_deleted_at_idx" ON "companies"("organization_id", "deleted_at");
CREATE INDEX "contacts_company_id_deleted_at_idx" ON "contacts"("company_id", "deleted_at");
CREATE INDEX "addresses_company_id_deleted_at_idx" ON "addresses"("company_id", "deleted_at");
CREATE INDEX "phone_numbers_contact_id_deleted_at_idx" ON "phone_numbers"("contact_id", "deleted_at");
CREATE INDEX "pipelines_organization_id_deleted_at_idx" ON "pipelines"("organization_id", "deleted_at");
CREATE INDEX "pipeline_stages_pipeline_id_deleted_at_idx" ON "pipeline_stages"("pipeline_id", "deleted_at");
CREATE INDEX "deals_organization_id_deleted_at_idx" ON "deals"("organization_id", "deleted_at");
CREATE INDEX "deals_company_id_deleted_at_idx" ON "deals"("company_id", "deleted_at");
CREATE INDEX "activities_company_id_deleted_at_idx" ON "activities"("company_id", "deleted_at");
CREATE INDEX "notes_company_id_deleted_at_idx" ON "notes"("company_id", "deleted_at");
CREATE INDEX "tasks_organization_id_deleted_at_idx" ON "tasks"("organization_id", "deleted_at");
CREATE INDEX "tasks_company_id_deleted_at_idx" ON "tasks"("company_id", "deleted_at");
CREATE INDEX "tags_organization_id_deleted_at_idx" ON "tags"("organization_id", "deleted_at");
CREATE INDEX "custom_field_definitions_org_entity_deleted_at_idx" ON "custom_field_definitions"("organization_id", "entity_type", "deleted_at");
CREATE INDEX "custom_field_values_entity_id_deleted_at_idx" ON "custom_field_values"("entity_id", "deleted_at");
