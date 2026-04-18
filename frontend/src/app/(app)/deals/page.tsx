"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Loader2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { getDashboard } from "@/app/actions/dashboard";
import { cn } from "@/lib/utils";
import type {
  DashboardData,
  DealStatus,
  DealWithCustomer,
} from "@/lib/types";
import { DEAL_STATUSES } from "@/lib/types";

const ANY = "ANY" as const;
type StatusFilter = DealStatus | typeof ANY;

const STATUS_LABEL: Record<DealStatus, string> = {
  OPEN: "Open",
  WON: "Won",
  LOST: "Lost",
};

const STATUS_STYLE: Record<DealStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  WON: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  LOST: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DealsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ANY);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load deals.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allDeals = data?.deals ?? [];
  const filtered =
    statusFilter === ANY
      ? allDeals
      : allDeals.filter((d) => d.status === statusFilter);

  const openDeals = allDeals.filter((d) => d.status === "OPEN");
  const wonDeals = allDeals.filter((d) => d.status === "WON");
  const lostDeals = allDeals.filter((d) => d.status === "LOST");
  const openValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? Math.round(
          (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100,
        )
      : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight">Deals</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Track your pipeline and revenue
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="flex size-9 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950">
                <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(openValue)}
                </p>
                <p className="text-xs text-muted-foreground">Pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="flex size-9 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-950">
                <Trophy className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatCurrency(wonValue)}
                </p>
                <p className="text-xs text-muted-foreground">Won</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                <DollarSign className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {allDeals.length}
                </p>
                <p className="text-xs text-muted-foreground">Total deals</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="flex size-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950">
                <TrendingUp className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{winRate}%</p>
                <p className="text-xs text-muted-foreground">Win rate</p>
              </div>
            </div>
          </div>

          {/* Pipeline Bar */}
          {allDeals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Pipeline breakdown
              </p>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {openDeals.length > 0 && (
                  <div
                    className="bg-blue-500 transition-all"
                    style={{
                      width: `${(openDeals.length / allDeals.length) * 100}%`,
                    }}
                  />
                )}
                {wonDeals.length > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{
                      width: `${(wonDeals.length / allDeals.length) * 100}%`,
                    }}
                  />
                )}
                {lostDeals.length > 0 && (
                  <div
                    className="bg-red-400 transition-all"
                    style={{
                      width: `${(lostDeals.length / allDeals.length) * 100}%`,
                    }}
                  />
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500" />
                  Open ({openDeals.length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Won ({wonDeals.length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-400" />
                  Lost ({lostDeals.length})
                </span>
              </div>
            </div>
          )}

          {/* Filter + List */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">All deals</h2>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger
                  className="h-7 w-[7rem] text-sm"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All</SelectItem>
                  {DEAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No deals found"
                description={
                  statusFilter !== ANY
                    ? "Try a different filter."
                    : "Create deals from the customer detail page."
                }
              />
            ) : (
              <div className="divide-y rounded-lg border">
                {filtered.map((d) => (
                  <Link
                    key={d.id}
                    href={`/customers/${d.customerId}`}
                    className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {d.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] shrink-0",
                            STATUS_STYLE[d.status],
                          )}
                        >
                          {STATUS_LABEL[d.status]}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{d.customer.companyName ?? "Untitled"}</span>
                        {d.expectedCloseDate && (
                          <>
                            <span className="text-border">|</span>
                            <span>
                              Close{" "}
                              {format(
                                new Date(d.expectedCloseDate),
                                "MMM d, yyyy",
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrency(d.value)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
