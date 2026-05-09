"use server";

import { serverApi } from "@/lib/api-server";
import type {
  ActivityCreate,
  ActivityListParams,
  ActivityUpdate,
} from "@/lib/types";

export async function listActivities(
  companyId: string,
  params?: ActivityListParams,
) {
  return serverApi.activities.list(companyId, params);
}

export async function getActivity(
  companyId: string,
  activityId: string,
) {
  return serverApi.activities.get(companyId, activityId);
}

export async function createActivity(
  companyId: string,
  input: ActivityCreate,
) {
  return serverApi.activities.create(companyId, input);
}

export async function updateActivity(
  companyId: string,
  activityId: string,
  input: ActivityUpdate,
) {
  return serverApi.activities.update(companyId, activityId, input);
}

export async function removeActivity(
  companyId: string,
  activityId: string,
) {
  return serverApi.activities.remove(companyId, activityId);
}
