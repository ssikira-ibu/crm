"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday, addDays } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getDashboard } from "@/app/actions/dashboard";
import { updateReminder } from "@/app/actions/reminders";
import { cn } from "@/lib/utils";
import { Timeline } from "@/components/timeline";
import { getGlobalEvents } from "@/app/actions/events";
import type {
  DashboardData,
  DealWithCustomer,
  EventWithCustomer,
  ReminderWithCustomer,
} from "@/lib/types";

function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<EventWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getDashboard(), getGlobalEvents({ limit: 10 })])
      .then(([dashRes, evtRes]) => {
        if (!cancelled) {
          setData(dashRes.data);
          setEvents(evtRes.data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load dashboard.";
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return { data, events, loading, refresh: () => setReloadKey((k) => k + 1) };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type AttentionItem = {
  id: string;
  type: "overdue-reminder" | "upcoming-reminder" | "closing-deal";
  title: string;
  customerId: string;
  customerName: string;
  detail: string;
  urgency: number;
  reminder?: ReminderWithCustomer;
};

function buildAttentionItems(data: DashboardData): AttentionItem[] {
  const items: AttentionItem[] = [];
  const now = new Date();
  const weekFromNow = addDays(now, 7);

  for (const r of data.reminders) {
    if (r.dateCompleted) continue;
    const due = new Date(r.dueDate);
    if (isPast(due)) {
      items.push({
        id: `reminder-${r.id}`,
        type: "overdue-reminder",
        title: r.title,
        customerId: r.customer.id,
        customerName: r.customer.companyName || "Untitled",
        detail: `Overdue ${formatDistanceToNow(due, { addSuffix: false })}`,
        urgency: now.getTime() - due.getTime(),
        reminder: r,
      });
    } else if (isToday(due)) {
      items.push({
        id: `reminder-${r.id}`,
        type: "upcoming-reminder",
        title: r.title,
        customerId: r.customer.id,
        customerName: r.customer.companyName || "Untitled",
        detail: "Due today",
        urgency: 0,
        reminder: r,
      });
    }
  }

  for (const d of data.deals ?? []) {
    if (d.status !== "OPEN" || !d.expectedCloseDate) continue;
    const closeDate = new Date(d.expectedCloseDate);
    if (closeDate <= weekFromNow && !isPast(closeDate)) {
      items.push({
        id: `deal-${d.id}`,
        type: "closing-deal",
        title: d.title,
        customerId: d.customerId,
        customerName: d.customer.companyName || "Untitled",
        detail: `Closes ${format(closeDate, "MMM d")}  ·  ${formatCurrency(d.value)}`,
        urgency: -(closeDate.getTime() - now.getTime()),
      });
    }
  }

  items.sort((a, b) => b.urgency - a.urgency);
  return items;
}

const ATTENTION_ICON = {
  "overdue-reminder": AlertTriangle,
  "upcoming-reminder": Clock,
  "closing-deal": DollarSign,
};

const ATTENTION_STYLE = {
  "overdue-reminder": "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  "upcoming-reminder": "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  "closing-deal": "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
};

export default function HomePage() {
  const { data, events, loading, refresh } = useDashboard();

  async function handleToggle(r: ReminderWithCustomer) {
    try {
      await updateReminder(r.customer.id, r.id, {
        dateCompleted: r.dateCompleted ? null : new Date().toISOString(),
      });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update reminder.");
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCustomers = data?.stats.total ?? 0;
  const activeCount = data?.stats.byStatus?.ACTIVE ?? 0;
  const leadCount = data?.stats.byStatus?.LEAD ?? 0;
  const openDealsValue = data?.stats.openDealsValue ?? 0;
  const openDealsCount = data?.stats.openDealsCount ?? 0;
  const openDeals = data?.deals?.filter((d) => d.status === "OPEN") ?? [];
  const attentionItems = data ? buildAttentionItems(data) : [];

  return (
    <div className="flex flex-1 flex-col">
      {/* Compact stats bar */}
      <div className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Home</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <Link href="/customers" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Users className="size-3.5" />
            <span className="font-medium tabular-nums text-foreground">{totalCustomers}</span>
            customers
          </Link>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="font-medium tabular-nums text-foreground">{activeCount}</span>
            active
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-3.5 text-blue-500" />
            <span className="font-medium tabular-nums text-foreground">{leadCount}</span>
            leads
          </span>
          <Link href="/deals" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <TrendingUp className="size-3.5 text-violet-500" />
            <span className="font-medium tabular-nums text-foreground">{openDealsCount}</span>
            pipeline
            {openDealsValue > 0 && (
              <span className="text-xs text-muted-foreground">({formatCurrency(openDealsValue)})</span>
            )}
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
          {/* Needs attention */}
          {attentionItems.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                <h2 className="text-sm font-medium">Needs attention</h2>
                <span className="text-xs text-muted-foreground">({attentionItems.length})</span>
              </div>
              <div className="rounded-lg border divide-y">
                {attentionItems.map((item) => {
                  const Icon = ATTENTION_ICON[item.type];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      {item.reminder && (
                        <Checkbox
                          className="shrink-0"
                          checked={false}
                          onCheckedChange={() => handleToggle(item.reminder!)}
                        />
                      )}
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full",
                          ATTENTION_STYLE[item.type],
                        )}
                      >
                        <Icon className="size-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Link
                            href={`/customers/${item.customerId}`}
                            className="hover:text-foreground transition-colors"
                          >
                            {item.customerName}
                          </Link>
                          <span className="text-border">|</span>
                          <span className={cn(item.type === "overdue-reminder" && "text-destructive")}>
                            {item.detail}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Two column: Pipeline + Activity */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pipeline */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="size-4 text-blue-500" />
                  <h2 className="text-sm font-medium">Open pipeline</h2>
                </div>
                {openDealsValue > 0 && (
                  <span className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                    {formatCurrency(openDealsValue)}
                  </span>
                )}
              </div>
              {openDeals.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No open deals.{" "}
                    <Link href="/deals" className="underline hover:text-foreground">
                      View all deals
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border divide-y">
                  {openDeals.slice(0, 5).map((d) => (
                    <Link
                      key={d.id}
                      href={`/customers/${d.customerId}`}
                      className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {d.customer.companyName ?? "Untitled"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-blue-600 dark:text-blue-400">
                        {formatCurrency(d.value)}
                      </span>
                    </Link>
                  ))}
                  {openDeals.length > 5 && (
                    <Link
                      href="/deals"
                      className="flex items-center justify-center px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all {openDeals.length} deals
                      <ArrowRight className="ml-1 size-3" />
                    </Link>
                  )}
                </div>
              )}
            </section>

            {/* Recent activity */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-amber-500" />
                  <h2 className="text-sm font-medium">Recent activity</h2>
                </div>
                <Link
                  href="/activity"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </div>
              {events.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No activity yet. Events appear as you work with customers.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border p-2">
                  <Timeline events={events.slice(0, 8)} showCustomer />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
