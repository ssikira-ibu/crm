"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Timeline } from "@/components/timeline";
import { getGlobalEvents } from "@/app/actions/events";
import type { EventWithCustomer } from "@/lib/types";

export default function TimelinePage() {
  const [events, setEvents] = useState<EventWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGlobalEvents({ limit: 50 })
      .then((res) => {
        if (!cancelled) setEvents(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load timeline.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight">Timeline</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Everything that happened across all customers
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-6">
          {events.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No activity yet"
              description="Events will appear here as you work with customers — creating deals, logging calls, adding notes, and more."
            />
          ) : (
            <Timeline events={events} showCustomer />
          )}
        </div>
      </div>
    </div>
  );
}
