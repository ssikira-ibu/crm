"use server";

import { serverApi } from "@/lib/api-server";
import type {
  PipelineCreate,
  PipelineStageCreate,
  PipelineStageUpdate,
  PipelineUpdate,
} from "@/lib/types";

export async function listPipelines() {
  return serverApi.pipelines.list();
}

export async function getPipeline(id: string) {
  return serverApi.pipelines.get(id);
}

export async function createPipeline(input: PipelineCreate) {
  return serverApi.pipelines.create(input);
}

export async function updatePipeline(id: string, input: PipelineUpdate) {
  return serverApi.pipelines.update(id, input);
}

export async function deletePipeline(id: string) {
  return serverApi.pipelines.remove(id);
}

export async function createPipelineStage(
  pipelineId: string,
  input: PipelineStageCreate,
) {
  return serverApi.pipelines.createStage(pipelineId, input);
}

export async function updatePipelineStage(
  pipelineId: string,
  stageId: string,
  input: PipelineStageUpdate,
) {
  return serverApi.pipelines.updateStage(pipelineId, stageId, input);
}

export async function deletePipelineStage(pipelineId: string, stageId: string) {
  return serverApi.pipelines.removeStage(pipelineId, stageId);
}
