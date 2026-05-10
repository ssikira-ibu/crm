"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Building2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealWithCompany, PipelineStage } from "@/lib/types";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function stageDotColor(stage: PipelineStage): string {
  if (stage.isWon) return "bg-emerald-500";
  if (stage.isLost) return "bg-red-400";
  return "bg-blue-500";
}

function stageHeaderColor(stage: PipelineStage): string {
  if (stage.isWon) return "text-emerald-500";
  if (stage.isLost) return "text-red-400";
  return "text-foreground";
}

function DealCard({ deal }: { deal: DealWithCompany }) {
  return (
    <Link
      href={`/deals/${deal.id}`}
      className="group block rounded-lg border bg-card p-3 transition-all hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug group-hover:text-foreground">
          {deal.title}
        </p>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(deal.value)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          <Building2 className="size-3 shrink-0" />
          <span className="truncate">{deal.company?.name ?? "Untitled"}</span>
        </span>
        {deal.expectedCloseDate && (
          <span className="flex items-center gap-1 shrink-0">
            <Calendar className="size-3" />
            {format(new Date(deal.expectedCloseDate), "MMM d")}
          </span>
        )}
      </div>
    </Link>
  );
}

type Props = {
  deals: DealWithCompany[];
};

export function BoardView({ deals }: Props) {
  const stageMap = new Map<string, PipelineStage>();
  for (const d of deals) {
    if (d.stage && !stageMap.has(d.stage.id)) {
      stageMap.set(d.stage.id, d.stage);
    }
  }
  const stages = Array.from(stageMap.values()).sort((a, b) => a.position - b.position);

  if (stages.length === 0 && deals.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 pb-4">
      {stages.map((stage) => {
        const columnDeals = deals.filter((d) => d.stageId === stage.id);
        const totalValue = columnDeals.reduce((sum, d) => sum + d.value, 0);

        return (
          <div key={stage.id} className="flex w-72 shrink-0 flex-col">
            {/* Column Header */}
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className={cn("size-2 rounded-full", stageDotColor(stage))} />
                <span className={cn("text-sm font-medium", stageHeaderColor(stage))}>
                  {stage.name}
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {columnDeals.length}
                </span>
              </div>
              {totalValue > 0 && (
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {formatCurrency(totalValue)}
                </span>
              )}
            </div>

            {/* Column Body */}
            <div className="flex flex-1 flex-col gap-2 rounded-lg bg-muted/30 p-2 min-h-[200px]">
              {columnDeals.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-muted-foreground/40">No deals</p>
                </div>
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
