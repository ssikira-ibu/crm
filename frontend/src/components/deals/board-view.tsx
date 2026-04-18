"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, DollarSign, TrendingUp, Trophy, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealStatus, DealWithCustomer } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const COLUMN_CONFIG: Record<
  DealStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    headerStyle: string;
    dotColor: string;
  }
> = {
  OPEN: {
    label: "Open",
    icon: TrendingUp,
    headerStyle: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  WON: {
    label: "Won",
    icon: Trophy,
    headerStyle: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
  LOST: {
    label: "Lost",
    icon: XCircle,
    headerStyle: "text-red-500 dark:text-red-400",
    dotColor: "bg-red-400",
  },
};

function DealCard({ deal }: { deal: DealWithCustomer }) {
  return (
    <Link
      href={`/customers/${deal.customerId}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium">{deal.title}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatCurrency(deal.value)}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {deal.customer.companyName ?? "Untitled"}
      </p>
      {deal.expectedCloseDate && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="size-3" />
          <span>{format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}</span>
        </div>
      )}
    </Link>
  );
}

type Props = {
  deals: DealWithCustomer[];
};

export function BoardView({ deals }: Props) {
  const columns: DealStatus[] = ["OPEN", "WON", "LOST"];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {columns.map((status) => {
        const config = COLUMN_CONFIG[status];
        const Icon = config.icon;
        const columnDeals = deals.filter((d) => d.status === status);
        const totalValue = columnDeals.reduce((sum, d) => sum + d.value, 0);

        return (
          <div key={status} className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("flex size-2 rounded-full", config.dotColor)} />
                <span className={cn("text-sm font-medium", config.headerStyle)}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {columnDeals.length}
                </span>
              </div>
              {totalValue > 0 && (
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {formatCurrency(totalValue)}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2 rounded-lg bg-muted/30 p-2 min-h-[120px]">
              {columnDeals.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground/60">
                  No {config.label.toLowerCase()} deals
                </p>
              ) : (
                columnDeals.map((d) => <DealCard key={d.id} deal={d} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
