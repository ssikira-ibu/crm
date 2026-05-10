"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PartitionBar, {
  PartitionBarSegment,
  PartitionBarSegmentTitle,
  PartitionBarSegmentValue,
} from "@/components/ui/partition-bar";
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

function getInitialView(): string {
  if (typeof window === "undefined") return "list";
  return localStorage.getItem("crm:deals-view") || "list";
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

const SEGMENT_BAR_COLORS: string[] = [
  "bg-sky-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-teal-400",
  "bg-orange-400",
];

const SEGMENT_TEXT_COLORS: string[] = [
  "text-sky-400",
  "text-amber-400",
  "text-rose-400",
  "text-violet-400",
  "text-teal-400",
  "text-orange-400",
];

function PipelineFunnel({ stages }: { stages: DealsOverviewStageSummary[] }) {
  if (stages.length === 0) return null;

  return (
    <PartitionBar size="sm" gap={1}>
      {stages.map((stage, i) => (
        <PartitionBarSegment
          key={stage.id}
          num={stage.value}
          className={SEGMENT_BAR_COLORS[i % SEGMENT_BAR_COLORS.length]}
          alignment="left"
        >
          <PartitionBarSegmentTitle className={cn("text-muted-foreground font-normal", SEGMENT_TEXT_COLORS[i % SEGMENT_TEXT_COLORS.length])}>
            {stage.name}
          </PartitionBarSegmentTitle>
          <PartitionBarSegmentValue className="text-foreground font-medium tabular-nums">
            {formatCurrency(stage.value)} <span className="text-muted-foreground/50 font-normal">({stage.count})</span>
          </PartitionBarSegmentValue>
        </PartitionBarSegment>
      ))}
    </PartitionBar>
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
  const [view, setView] = useState(getInitialView);
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

  function handleViewChange(v: string) {
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
    <Tabs value={view} onValueChange={handleViewChange} className="flex flex-1 flex-col overflow-hidden gap-0 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Deals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {metrics ? `${metrics.totalDeals} deals across your pipeline` : " "}
          </p>
        </div>
        <TabsList>
          <TabsTrigger value="list">
            <List className="size-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="board">
            <Kanban className="size-4" />
            Board
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Metrics + Funnel — shared between views */}
      <div className="border-b px-6 py-4 space-y-4">
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

        {stageSummary.length > 0 && (
          <PipelineFunnel stages={stageSummary} />
        )}
      </div>

      {/* List View */}
      <TabsContent value="list" className="flex-1 overflow-auto mt-0">
        {deals.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={TrendingUp}
              title="No deals yet"
              description="Create deals from the company detail page to start tracking your pipeline."
            />
          </div>
        ) : (
          <>
            {/* Column Headers */}
            <div className="grid grid-cols-[1fr_160px_110px_110px_100px_20px] items-center gap-4 border-b px-6 py-2 sticky top-0 bg-background z-10">
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
              <div />
            </div>

            {/* Rows */}
            <div className="divide-y">
              {sortedDeals.map((d) => (
                <Link
                  key={d.id}
                  href={`/customers/${d.companyId}`}
                  className="group grid grid-cols-[1fr_160px_110px_110px_100px_20px] items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium">
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
                  <ChevronRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          </>
        )}
      </TabsContent>

      {/* Board View */}
      <TabsContent value="board" className="flex-1 overflow-hidden mt-0 min-w-0">
        {deals.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={TrendingUp}
              title="No deals yet"
              description="Create deals from the company detail page to start tracking your pipeline."
            />
          </div>
        ) : (
          <div className="h-full overflow-x-auto p-6">
            <BoardView deals={deals} />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
