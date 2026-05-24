"use server";

import { serverApi } from "@/lib/api-server";

export async function listNotifications(params?: {
  limit?: number;
  unreadOnly?: boolean;
  cursor?: string;
}) {
  return serverApi.notifications.list(params);
}

export async function markNotificationRead(id: string) {
  return serverApi.notifications.markRead(id);
}

export async function markAllNotificationsRead() {
  return serverApi.notifications.markAllRead();
}
