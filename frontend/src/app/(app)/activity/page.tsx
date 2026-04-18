"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { ACTIVITY_TYPES, type ActivityType, type ActivityWithCustomer } from "@/lib/types";

const ANY = "ANY" as const;
type TypeFilter = ActivityType | typeof ANY;

const TYPE_ICON: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  OTHER: MoreHorizontal,
};

const TYPE_LABEL: Record<ActivityType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  OTHER: "Other",
};

const TYPE_STYLE: Record<ActivityType, string> = {
  CALL: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  EMAIL: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  MEETING: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  OTHER: "bg-muted text-muted-foreground",
};

function groupByDate(activities: ActivityWithCustomer[]): [string, ActivityWithCustomer[]][] {
  const groups = new Map<string, ActivityWithCustomer[]>();
  for (const a of activities) {
    const d = new Date(a.date);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else label = format(d, "EEEE, MMMM d");
    const existing = groups.get(label);
    if (existing) existing.push(a);
    else groups.set(label, [a]);
  }
  return Array.from(groups.entries());
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ANY);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard()
      .then((res) => {
        if (!cancelled) setActivities(res.data.recentActivities);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load activities.",
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

  const filtered =
    typeFilter === ANY
      ? activities
      : activities.filter((a) => a.type === typeFilter);

  const groups = groupByDate(filtered);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight">Activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Recent interactions across all customers
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
          {/* Filter */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} activit{filtered.length === 1 ? "y" : "ies"}
            </p>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TypeFilter)}
            >
              <SelectTrigger
                className="h-7 w-[7rem] text-sm"
                aria-label="Filter by type"
              >
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All types</SelectItem>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No activities yet"
              description={
                typeFilter !== ANY
                  ? "Try a different filter."
                  : "Log activities from the customer detail page to see them here."
              }
            />
          ) : (
            groups.map(([dateLabel, items]) => (
              <section key={dateLabel}>
                <h2 className="mb-2 text-xs font-medium text-muted-foreground">
                  {dateLabel}
                </h2>
                <div className="relative space-y-0">
                  <div className="absolute left-[17px] top-3 bottom-3 w-px bg-border" />
                  {items.map((a) => {
                    const Icon = TYPE_ICON[a.type];
                    const dateObj = new Date(a.date);
                    return (
                      <Link
                        key={a.id}
                        href={`/customers/${a.customerId}`}
                        className="group relative flex items-start gap-3 rounded-md py-2.5 pl-1 pr-2 transition-colors hover:bg-muted/50"
                      >
                        <div
                          className={cn(
                            "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                            TYPE_STYLE[a.type],
                          )}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {a.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] shrink-0"
                            >
                              {TYPE_LABEL[a.type]}
                            </Badge>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>
                              {a.customer.companyName ?? "Untitled"}
                            </span>
                            <span className="text-border">|</span>
                            <span>
                              {format(dateObj, "h:mm a")} ·{" "}
                              {formatDistanceToNow(dateObj, {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          {a.description && (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {a.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
