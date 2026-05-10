"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Kanban,
  List,
  Loader2,
  Minus,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { BoardView } from "@/components/deals/board-view";
import { getDealsOverview } from "@/app/actions/deals";
import { cn } from "@/lib/utils";
import type {
  DealWithCompany,
  DealsOverview,
  DealsOverviewStageSummary,
  PipelineStage,
} from "@/lib/types";

type ViewMode = "board" | "list";
type SortField = "title" | "value" | "company" | "stage" | "expectedCloseDate";
type SortDir = "asc" | "desc";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitialView(): ViewMode {
  if (typeof window === "undefined") return "list";
  return (localStorage.getItem("crm:deals-view") as ViewMode) || "list";
}

function stageStyle(stage: PipelineStage): string {
  if (stage.isWon) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (stage.isLost) return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
}

function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums tracking-tight">{value}</span>
        {subValue && (
          <span className="text-xs text-muted-foreground">{subValue}</span>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          {trend.direction === "up" && <ArrowUp className="size-3 text-emerald-500" />}
          {trend.direction === "down" && <ArrowDown className="size-3 text-red-400" />}
          {trend.direction === "neutral" && <Minus className="size-3 text-muted-foreground" />}
          <span className={cn(
            trend.direction === "up" && "text-emerald-500",
            trend.direction === "down" && "text-red-400",
            trend.direction === "neutral" && "text-muted-foreground",
          )}>
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

function PipelineFunnel({ stages, total }: { stages: DealsOverviewStageSummary[]; total: number }) {
  if (stages.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/50">
        {stages.map((stage, i) => {
          const pct = total > 0 ? (stage.value / total) * 100 : 0;
          if (pct === 0) return null;
          const colors = [
            "bg-blue-400",
            "bg-blue-500",
            "bg-indigo-500",
            "bg-violet-500",
            "bg-purple-500",
            "bg-fuchsia-500",
          ];
          return (
            <div
              key={stage.id}
              className={cn("transition-all", colors[i % colors.length])}
              style={{ width: `${pct}%` }}
              title={`${stage.name}: ${formatFullCurrency(stage.value)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {stages.map((stage, i) => {
          const colors = [
            "bg-blue-400",
            "bg-blue-500",
            "bg-indigo-500",
            "bg-violet-500",
            "bg-purple-500",
            "bg-fuchsia-500",
          ];
          return (
            <div key={stage.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", colors[i % colors.length])} />
              <span>{stage.name}</span>
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(stage.value)}
              </span>
              <span className="text-muted-foreground/60">
                ({stage.count})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = currentSort === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors",
        active && "text-foreground",
        className,
      )}
    >
      {label}
      {active ? (
        currentDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-0 group-hover/th:opacity-50" />
      )}
    </button>
  );
}

function sortDeals(deals: DealWithCompany[], field: SortField, dir: SortDir): DealWithCompany[] {
  const sorted = [...deals].sort((a, b) => {
    switch (field) {
      case "title":
        return a.title.localeCompare(b.title);
      case "value":
        return a.value - b.value;
      case "company":
        return (a.company?.name ?? "").localeCompare(b.company?.name ?? "");
      case "stage":
        return (a.stage?.position ?? 0) - (b.stage?.position ?? 0);
      case "expectedCloseDate": {
        const da = a.expectedCloseDate ? new Date(a.expectedCloseDate).getTime() : 0;
        const db = b.expectedCloseDate ? new Date(b.expectedCloseDate).getTime() : 0;
        return da - db;
      }
      default:
        return 0;
    }
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

export default function DealsPage() {
  const [data, setData] = useState<DealsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>(getInitialView);
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getDealsOverview();
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Failed to load deals.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  function switchView(v: ViewMode) {
    setView(v);
    localStorage.setItem("crm:deals-view", v);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "value" ? "desc" : "asc");
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const deals = data?.deals ?? [];
  const stageSummary = data?.stageSummary ?? [];
  const sortedDeals = sortDeals(deals, sortField, sortDir);

  const wonTrend = metrics
    ? metrics.wonLastMonth > 0
      ? {
          direction: metrics.wonThisMonth >= metrics.wonLastMonth ? "up" as const : "down" as const,
          label: `${Math.abs(Math.round(((metrics.wonThisMonth - metrics.wonLastMonth) / metrics.wonLastMonth) * 100))}% vs last month`,
        }
      : metrics.wonThisMonth > 0
        ? { direction: "up" as const, label: "New this month" }
        : { direction: "neutral" as const, label: "No deals last month" }
    : undefined;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Deals</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {metrics ? `${metrics.totalDeals} deals across your pipeline` : " "}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button
              onClick={() => switchView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" />
              List
            </button>
            <button
              onClick={() => switchView("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === "board"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Kanban className="size-3.5" />
              Board
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
          {/* Metric Cards */}
          {metrics && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                label="Pipeline"
                value={formatCurrency(metrics.pipelineValue)}
                subValue={`${metrics.openCount} open`}
                icon={TrendingUp}
              />
              <MetricCard
                label="Weighted Forecast"
                value={formatCurrency(metrics.weightedForecast)}
                subValue="by probability"
                icon={Target}
              />
              <MetricCard
                label="Won This Month"
                value={formatCurrency(metrics.wonThisMonth)}
                subValue={`${metrics.wonCount} total won`}
                icon={Trophy}
                trend={wonTrend}
              />
              <MetricCard
                label="Win Rate"
                value={`${metrics.winRate}%`}
                subValue={`${metrics.wonCount}W / ${metrics.lostCount}L`}
                icon={DollarSign}
              />
            </div>
          )}

          {/* Pipeline Funnel Bar */}
          {stageSummary.length > 0 && metrics && (
            <PipelineFunnel stages={stageSummary} total={metrics.pipelineValue} />
          )}

          {/* Content */}
          {deals.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No deals yet"
              description="Create deals from the company detail page to start tracking your pipeline."
            />
          ) : view === "board" ? (
            <BoardView deals={deals} />
          ) : (
            <div className="rounded-lg border">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_140px_120px_120px_100px] items-center gap-4 border-b px-4 py-2">
                <div className="group/th">
                  <SortableHeader label="Deal" field="title" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </div>
                <div className="group/th">
                  <SortableHeader label="Company" field="company" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </div>
                <div className="group/th">
                  <SortableHeader label="Stage" field="stage" currentSort={sortField} currentDir={sortDir} onSort={handleSort} />
                </div>
                <div className="group/th flex justify-end">
                  <SortableHeader label="Close Date" field="expectedCloseDate" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="justify-end" />
                </div>
                <div className="group/th flex justify-end">
                  <SortableHeader label="Value" field="value" currentSort={sortField} currentDir={sortDir} onSort={handleSort} className="justify-end" />
                </div>
              </div>

              {/* Table Rows */}
              <div className="divide-y">
                {sortedDeals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/customers/${d.companyId}`}
                    className="group grid grid-cols-[1fr_140px_120px_120px_100px] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <span className="truncate text-sm font-medium group-hover:text-foreground">
                        {d.title}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="truncate text-sm text-muted-foreground">
                        {d.company?.name ?? "—"}
                      </span>
                    </div>
                    <div>
                      <Badge
                        variant="outline"
                        className={cn("text-[11px] font-medium", stageStyle(d.stage))}
                      >
                        {d.stage.name}
                      </Badge>
                    </div>
                    <div className="text-right">
                      {d.expectedCloseDate ? (
                        <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {format(new Date(d.expectedCloseDate), "MMM d")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium tabular-nums">
                        {formatFullCurrency(d.value)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
