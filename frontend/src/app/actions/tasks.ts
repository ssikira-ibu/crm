"use server";

import { serverApi } from "@/lib/api-server";
import type {
  TaskCreate,
  TaskListParams,
  TaskUpdate,
} from "@/lib/types";

export async function listTasks(
  companyId: string,
  params?: TaskListParams,
) {
  return serverApi.tasks.list(companyId, params);
}

export async function listAllTasks(params?: TaskListParams) {
  return serverApi.tasks.listAll(params);
}

export async function getTask(
  companyId: string,
  taskId: string,
) {
  return serverApi.tasks.get(companyId, taskId);
}

export async function createTask(
  companyId: string,
  input: TaskCreate,
) {
  return serverApi.tasks.create(companyId, input);
}

export async function updateTask(
  companyId: string,
  taskId: string,
  input: TaskUpdate,
) {
  return serverApi.tasks.update(companyId, taskId, input);
}

export async function removeTask(
  companyId: string,
  taskId: string,
) {
  return serverApi.tasks.remove(companyId, taskId);
}
