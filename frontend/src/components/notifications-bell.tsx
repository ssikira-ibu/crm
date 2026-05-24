"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import type { NotificationItem } from "@/lib/api-server";

type State = {
  items: NotificationItem[];
  unreadCount: number;
};

export function NotificationsBell() {
  const [state, setState] = useState<State>({ items: [], unreadCount: 0 });
  const [, startTransition] = useTransition();

  async function refresh() {
    const res = await listNotifications({ limit: 20 });
    setState({ items: res.data, unreadCount: res.unreadCount });
  }

  useEffect(() => {
    void refresh();
    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("notification", () => {
      void refresh();
    });
    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do.
    };
    return () => es.close();
  }, []);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      await refresh();
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      await refresh();
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {state.unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
            >
              {state.unreadCount > 9 ? "9+" : state.unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">Notifications</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAll}
            disabled={state.unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {state.items.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No notifications yet
            </div>
          )}
          {state.items.map((n) => {
            const unread = !n.readAt;
            const body = (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {unread && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                  <div className="text-sm font-medium">{n.title}</div>
                </div>
                {n.body && (
                  <div className="text-xs text-muted-foreground">{n.body}</div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            );
            return (
              <div
                key={n.id}
                className={`border-b px-3 py-2 last:border-b-0 ${
                  unread ? "bg-accent/30" : ""
                }`}
              >
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => handleMarkRead(n.id)}
                    className="block hover:bg-accent/50 -mx-3 -my-2 px-3 py-2"
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className="block w-full text-left"
                  >
                    {body}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
