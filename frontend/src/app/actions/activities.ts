"use server";

import { serverApi } from "@/lib/api-server";
import type {
  ActivityCreate,
  ActivityListParams,
  ActivityUpdate,
} from "@/lib/types";

export async function listActivities(
  customerId: string,
  params?: ActivityListParams,
) {
  return serverApi.activities.list(customerId, params);
}

export async function getActivity(
  customerId: string,
  activityId: string,
) {
  return serverApi.activities.get(customerId, activityId);
}

export async function createActivity(
  customerId: string,
  input: ActivityCreate,
) {
  return serverApi.activities.create(customerId, input);
}

export async function updateActivity(
  customerId: string,
  activityId: string,
  input: ActivityUpdate,
) {
  return serverApi.activities.update(customerId, activityId, input);
}

export async function removeActivity(
  customerId: string,
  activityId: string,
) {
  return serverApi.activities.remove(customerId, activityId);
}
