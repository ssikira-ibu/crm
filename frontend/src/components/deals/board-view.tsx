"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealWithCompany, PipelineStage } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function stageHeaderStyle(stage: PipelineStage): string {
  if (stage.isWon) return "text-emerald-600 dark:text-emerald-400";
  if (stage.isLost) return "text-red-500 dark:text-red-400";
  return "text-blue-600 dark:text-blue-400";
}

function stageDotColor(stage: PipelineStage): string {
  if (stage.isWon) return "bg-emerald-500";
  if (stage.isLost) return "bg-red-400";
  return "bg-blue-500";
}

function DealCard({ deal }: { deal: DealWithCompany }) {
  return (
    <Link
      href={`/customers/${deal.companyId}`}
      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-medium">{deal.title}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatCurrency(deal.value)}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {deal.company.name ?? "Untitled"}
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
  deals: DealWithCompany[];
};

export function BoardView({ deals }: Props) {
  // Build unique stages from the deals, ordered by position
  const stageMap = new Map<string, PipelineStage>();
  for (const d of deals) {
    if (d.stage && !stageMap.has(d.stage.id)) {
      stageMap.set(d.stage.id, d.stage);
    }
  }
  const stages = Array.from(stageMap.values()).sort((a, b) => a.position - b.position);

  // If no stages found (empty deals), show nothing
  if (stages.length === 0 && deals.length === 0) {
    return null;
  }

  return (
    <div
      className="grid grid-cols-1 gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(0, 1fr))` }}
    >
      {stages.map((stage) => {
        const columnDeals = deals.filter((d) => d.stageId === stage.id);
        const totalValue = columnDeals.reduce((sum, d) => sum + d.value, 0);

        return (
          <div key={stage.id} className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("flex size-2 rounded-full", stageDotColor(stage))} />
                <span className={cn("text-sm font-medium", stageHeaderStyle(stage))}>
                  {stage.name}
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
                  No {stage.name.toLowerCase()} deals
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
