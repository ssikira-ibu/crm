"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Timeline } from "@/components/timeline";
import { getCustomerEvents } from "@/app/actions/events";
import type { EventWithCustomer } from "@/lib/types";

type Props = {
  customerId: string;
  reloadKey: number;
};

export function TimelineTab({ customerId, reloadKey }: Props) {
  const [events, setEvents] = useState<EventWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getCustomerEvents(customerId, { limit: 50 });
        if (!cancelled) setEvents(res.data);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load timeline.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [customerId, reloadKey]);

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="No events yet"
        description="A timeline of everything that happens with this customer will appear here."
      />
    );
  }

  return <Timeline events={events} />;
}
