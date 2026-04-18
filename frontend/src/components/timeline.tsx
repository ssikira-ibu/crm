"use client";

import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Tag,
  TrendingUp,
  Trophy,
  UserPlus,
  UserMinus,
  XCircle,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventWithCustomer } from "@/lib/types";

type EventConfig = {
  icon: React.ComponentType<{ className?: string }>;
  style: string;
  describe: (e: EventWithCustomer) => string;
};

function getEventConfig(e: EventWithCustomer): EventConfig {
  const m = (e.metadata ?? {}) as Record<string, unknown>;
  const entity = e.entityType;
  const action = e.action;

  if (entity === "DEAL" && action === "CREATED") {
    return {
      icon: DollarSign,
      style: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
      describe: () => {
        const val = typeof m.value === "number" ? formatCurrency(m.value) : "";
        return `Created deal ${m.title ? `"${m.title}"` : ""}${val ? ` worth ${val}` : ""}`;
      },
    };
  }
  if (entity === "DEAL" && action === "STATUS_CHANGED") {
    const newStatus = m.new as string;
    if (newStatus === "WON") {
      return {
        icon: Trophy,
        style: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
        describe: () => {
          const val = typeof m.value === "number" ? ` — ${formatCurrency(m.value)}` : "";
          return `Won deal ${m.title ? `"${m.title}"` : ""}${val}`;
        },
      };
    }
    if (newStatus === "LOST") {
      return {
        icon: XCircle,
        style: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
        describe: () => `Lost deal ${m.title ? `"${m.title}"` : ""}`,
      };
    }
    return {
      icon: TrendingUp,
      style: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
      describe: () => `Deal ${m.title ? `"${m.title}"` : ""} status changed to ${newStatus}`,
    };
  }
  if (entity === "DEAL" && action === "DELETED") {
    return {
      icon: DollarSign,
      style: "bg-muted text-muted-foreground",
      describe: () => `Removed deal ${m.title ? `"${m.title}"` : ""}`,
    };
  }
  if (entity === "CONTACT" && action === "CREATED") {
    return {
      icon: UserPlus,
      style: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
      describe: () => `Added contact ${m.name ? `${m.name}` : ""}`,
    };
  }
  if (entity === "CONTACT" && action === "DELETED") {
    return {
      icon: UserMinus,
      style: "bg-muted text-muted-foreground",
      describe: () => `Removed contact ${m.name ? `${m.name}` : ""}`,
    };
  }
  if (entity === "NOTE" && action === "CREATED") {
    return {
      icon: FileText,
      style: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
      describe: () => `Added note ${m.title ? `"${m.title}"` : ""}`,
    };
  }
  if (entity === "REMINDER" && action === "CREATED") {
    return {
      icon: Calendar,
      style: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
      describe: () => `Set reminder ${m.title ? `"${m.title}"` : ""}`,
    };
  }
  if (entity === "REMINDER" && action === "COMPLETED") {
    return {
      icon: CheckCircle2,
      style: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
      describe: () => `Completed reminder ${m.title ? `"${m.title}"` : ""}`,
    };
  }
  if (entity === "ACTIVITY") {
    const actType = m.type as string | undefined;
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      CALL: Phone, EMAIL: Mail, MEETING: Calendar, OTHER: MoreHorizontal,
    };
    const styleMap: Record<string, string> = {
      CALL: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
      EMAIL: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
      MEETING: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
      OTHER: "bg-muted text-muted-foreground",
    };
    const labelMap: Record<string, string> = {
      CALL: "call", EMAIL: "email", MEETING: "meeting", OTHER: "activity",
    };
    return {
      icon: iconMap[actType ?? "OTHER"] ?? Zap,
      style: styleMap[actType ?? "OTHER"] ?? "bg-muted text-muted-foreground",
      describe: () => `Logged a ${labelMap[actType ?? "OTHER"] ?? "activity"} — ${m.title ?? ""}`,
    };
  }
  if (entity === "TAG" && action === "TAGGED") {
    return {
      icon: Tag,
      style: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
      describe: () => `Tagged as "${m.name ?? ""}"`,
    };
  }
  if (entity === "TAG" && action === "UNTAGGED") {
    return {
      icon: Tag,
      style: "bg-muted text-muted-foreground",
      describe: () => `Removed tag "${m.name ?? ""}"`,
    };
  }
  if (entity === "CUSTOMER" && action === "STATUS_CHANGED") {
    return {
      icon: Zap,
      style: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
      describe: () => `Status changed from ${m.old} to ${m.new}`,
    };
  }
  return {
    icon: Zap,
    style: "bg-muted text-muted-foreground",
    describe: () => `${action.toLowerCase()} ${entity.toLowerCase()}`,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function groupByDate(events: EventWithCustomer[]): [string, EventWithCustomer[]][] {
  const groups = new Map<string, EventWithCustomer[]>();
  for (const e of events) {
    const d = new Date(e.createdAt);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else label = format(d, "EEEE, MMMM d");
    const existing = groups.get(label);
    if (existing) existing.push(e);
    else groups.set(label, [e]);
  }
  return Array.from(groups.entries());
}

type Props = {
  events: EventWithCustomer[];
  showCustomer?: boolean;
};

export function Timeline({ events, showCustomer = false }: Props) {
  if (events.length === 0) return null;

  const groups = groupByDate(events);

  return (
    <div className="space-y-6">
      {groups.map(([dateLabel, items]) => (
        <section key={dateLabel}>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            {dateLabel}
          </h3>
          <div className="relative space-y-0">
            <div className="absolute left-[17px] top-3 bottom-3 w-px bg-border" />
            {items.map((e) => {
              const config = getEventConfig(e);
              const Icon = config.icon;
              const desc = config.describe(e);
              const dateObj = new Date(e.createdAt);

              const inner = (
                <>
                  <div
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                      config.style,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm">{desc}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {showCustomer && (
                        <>
                          <span className="font-medium">
                            {e.customer.companyName ?? "Untitled"}
                          </span>
                          <span className="text-border">|</span>
                        </>
                      )}
                      <span>
                        {format(dateObj, "h:mm a")} ·{" "}
                        {formatDistanceToNow(dateObj, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </>
              );

              if (showCustomer) {
                return (
                  <Link
                    key={e.id}
                    href={`/customers/${e.customerId}`}
                    className="group relative flex items-start gap-3 rounded-md py-2.5 pl-1 pr-2 transition-colors hover:bg-muted/50"
                  >
                    {inner}
                  </Link>
                );
              }

              return (
                <div
                  key={e.id}
                  className="relative flex items-start gap-3 py-2.5 pl-1"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
