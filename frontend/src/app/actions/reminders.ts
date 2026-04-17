"use server";

import { serverApi } from "@/lib/api-server";
import type {
  ReminderCreate,
  ReminderListParams,
  ReminderUpdate,
} from "@/lib/types";

export async function listReminders(
  customerId: string,
  params?: ReminderListParams,
) {
  return serverApi.reminders.list(customerId, params);
}

export async function getReminder(
  customerId: string,
  reminderId: string,
) {
  return serverApi.reminders.get(customerId, reminderId);
}

export async function createReminder(
  customerId: string,
  input: ReminderCreate,
) {
  return serverApi.reminders.create(customerId, input);
}

export async function updateReminder(
  customerId: string,
  reminderId: string,
  input: ReminderUpdate,
) {
  return serverApi.reminders.update(customerId, reminderId, input);
}

export async function removeReminder(
  customerId: string,
  reminderId: string,
) {
  return serverApi.reminders.remove(customerId, reminderId);
}
