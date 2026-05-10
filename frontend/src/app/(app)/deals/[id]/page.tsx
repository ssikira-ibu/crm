"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Calendar,
  DollarSign,
  FileWarning,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  TrendingUp,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { getDealDetail } from "@/app/actions/deals";
import { updateDeal } from "@/app/actions/deals";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { DealDetail, PipelineStage, Activity, Note, Task } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function stageBadgeStyle(stage: PipelineStage): string {
  if (stage.isWon) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (stage.isLost) return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
}

function StagePipeline({
  stages,
  currentStageId,
  onStageChange,
}: {
  stages: PipelineStage[];
  currentStageId: string;
  onStageChange: (stageId: string) => void;
}) {
  const currentIdx = stages.findIndex((s) => s.id === currentStageId);
  const currentStage = stages[currentIdx];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {stages.map((stage, i) => {
          const isActive = i <= currentIdx;
          const isCurrent = stage.id === currentStageId;
          const isTerminal = stage.isWon || stage.isLost;
          return (
            <button
              key={stage.id}
              onClick={() => onStageChange(stage.id)}
              className={cn(
                "h-2 flex-1 rounded-full transition-all",
                isCurrent && "ring-1 ring-offset-1 ring-offset-background",
                isTerminal && stage.isWon && (isActive ? "bg-emerald-500 ring-emerald-500" : "bg-muted"),
                isTerminal && stage.isLost && (isActive ? "bg-red-400 ring-red-400" : "bg-muted"),
                !isTerminal && (isActive ? "bg-blue-500 ring-blue-500" : "bg-muted"),
              )}
              title={stage.name}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{currentStage?.name}</span>
        <span className="text-muted-foreground">{currentStage?.probability}% probability</span>
      </div>
    </div>
  );
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="text-sm text-right">{children}</div>
    </div>
  );
}

type TimelineEntry =
  | { kind: "activity"; date: string; data: Activity }
  | { kind: "note"; date: string; data: Note };

function Timeline({ activities, notes }: { activities: Activity[]; notes: Note[] }) {
  const entries: TimelineEntry[] = [
    ...activities.map((a) => ({ kind: "activity" as const, date: a.date, data: a })),
    ...notes.map((n) => ({ kind: "note" as const, date: n.createdAt, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="size-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Activities and notes will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {entries.map((entry) => {
        if (entry.kind === "activity") {
          const a = entry.data;
          return (
            <div key={`a-${a.id}`} className="px-6 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {a.type}
                </Badge>
                <span className="text-sm font-medium">{a.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(new Date(a.date), "MMM d, yyyy")}
                </span>
              </div>
              {a.description && (
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              )}
            </div>
          );
        }
        const n = entry.data;
        return (
          <div key={`n-${n.id}`} className="px-6 py-3">
            <div className="flex items-center gap-2">
              <Pencil className="size-3 text-muted-foreground" />
              <span className="text-sm font-medium">{n.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {format(new Date(n.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            {n.body && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{n.body}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-1">
      {tasks.map((t) => (
        <div key={t.id} className="flex items-center gap-2 py-1.5">
          <div className={cn(
            "size-3 rounded-sm border",
            t.status === "DONE" && "bg-emerald-500 border-emerald-500",
            t.status === "TODO" && "border-muted-foreground/40",
            t.status === "IN_PROGRESS" && "border-blue-500 bg-blue-500/20",
          )} />
          <span className={cn(
            "text-sm flex-1 truncate",
            t.status === "DONE" && "text-muted-foreground line-through",
          )}>
            {t.title}
          </span>
          {t.dueDate && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(t.dueDate), "MMM d")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingStage, setUpdatingStage] = useState(false);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getDealDetail(id);
        if (!cancelled) setDeal(res.data);
      } catch (err) {
        if (cancelled) return;
        const msg = describeError(err);
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  async function handleStageChange(stageId: string) {
    if (!deal || stageId === deal.stageId || updatingStage) return;
    setUpdatingStage(true);
    try {
      await updateDeal(deal.companyId, deal.id, { stageId });
      refresh();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setUpdatingStage(false);
    }
  }

  if (loading && !deal) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={FileWarning}
          title="Deal unavailable"
          description={error ?? "We couldn't load this deal."}
        />
      </div>
    );
  }

  const allStages = deal.pipeline.stages;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/deals">Deals</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{deal.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate">{deal.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge
                variant="outline"
                className={cn("text-[11px] font-medium", stageBadgeStyle(deal.stage))}
              >
                {deal.stage.name}
              </Badge>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(deal.value)}</span>
            </div>
          </div>
        </div>

        <StagePipeline
          stages={allStages}
          currentStageId={deal.stageId}
          onStageChange={handleStageChange}
        />
      </div>

      {/* Main content + Sidebar */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Activity timeline — main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="border-b px-6 py-2.5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity</h2>
          </div>
          <Timeline activities={deal.activities} notes={deal.notes} />
        </div>

        {/* Sidebar — deal metadata */}
        <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l overflow-y-auto">
          {/* Details section */}
          <div className="px-4 py-3 space-y-0">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Details</h3>

            <MetadataRow label="Company">
              <Link
                href={`/customers/${deal.company.id}`}
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                <Building2 className="size-3" />
                {deal.company.name ?? "—"}
              </Link>
            </MetadataRow>

            <MetadataRow label="Owner">
              <span className="inline-flex items-center gap-1">
                <User className="size-3 text-muted-foreground" />
                {deal.owner?.displayName ?? deal.owner?.email ?? "—"}
              </span>
            </MetadataRow>

            {deal.contact && (
              <MetadataRow label="Contact">
                <span>{deal.contact.firstName} {deal.contact.lastName}</span>
                {deal.contact.jobTitle && (
                  <span className="block text-xs text-muted-foreground">{deal.contact.jobTitle}</span>
                )}
              </MetadataRow>
            )}

            <MetadataRow label="Value">
              <span className="font-medium tabular-nums">{formatCurrency(deal.value)}</span>
            </MetadataRow>

            <MetadataRow label="Probability">
              <span className="tabular-nums">{deal.stage.probability}%</span>
            </MetadataRow>

            <MetadataRow label="Expected Close">
              {deal.expectedCloseDate ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground" />
                  {format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </MetadataRow>

            {deal.closedAt && (
              <MetadataRow label="Closed">
                {format(new Date(deal.closedAt), "MMM d, yyyy")}
              </MetadataRow>
            )}

            <MetadataRow label="Created">
              {format(new Date(deal.createdAt), "MMM d, yyyy")}
            </MetadataRow>
          </div>

          <Separator />

          {/* Description */}
          {deal.description && (
            <>
              <div className="px-4 py-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{deal.description}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Tasks */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Tasks {deal.tasks.length > 0 && `(${deal.tasks.length})`}
              </h3>
            </div>
            {deal.tasks.length > 0 ? (
              <TaskList tasks={deal.tasks} />
            ) : (
              <p className="text-xs text-muted-foreground/60">No tasks</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
