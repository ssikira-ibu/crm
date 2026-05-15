CREATE UNIQUE INDEX "pipeline_stages_id_pipeline_id_key"
  ON "pipeline_stages"("id", "pipeline_id");

ALTER TABLE "deals" DROP CONSTRAINT "deals_stage_id_fkey";

ALTER TABLE "deals"
  ADD CONSTRAINT "deals_stage_id_pipeline_id_fkey"
  FOREIGN KEY ("stage_id", "pipeline_id")
  REFERENCES "pipeline_stages"("id", "pipeline_id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
