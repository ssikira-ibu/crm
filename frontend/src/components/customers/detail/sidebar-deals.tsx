"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { formatCurrency } from "@/components/timeline";
import { removeDeal } from "@/app/actions/deals";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Deal, PipelineStage } from "@/lib/types";
import { DealDialog } from "./deal-dialog";

function stageStyle(stage?: PipelineStage): string {
  if (!stage) return "bg-muted text-muted-foreground";
  if (stage.isWon) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (stage.isLost) return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
}

type DealWithStage = Deal & { stage: PipelineStage };

type Props = {
  companyId: string;
  items: DealWithStage[];
  onChanged: () => void;
};

export function SidebarDeals({ companyId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DealWithStage | null>(null);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(d: DealWithStage) {
    setEditing(d);
    setOpen(true);
  }

  async function onDelete(d: DealWithStage) {
    try {
      await removeDeal(companyId, d.id);
      toast.success("Deal deleted.");
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
      throw err;
    }
  }

  const openDeals = items.filter((d) => !d.stage?.isWon && !d.stage?.isLost);
  const totalOpen = openDeals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="border-b px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Deals{items.length > 0 && ` (${items.length})`}
        </h3>
        <Button variant="ghost" size="icon-xs" onClick={startCreate}>
          <Plus className="size-3" />
        </Button>
      </div>

      {totalOpen > 0 && (
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
          {formatCurrency(totalOpen)} in pipeline
        </p>
      )}

      {items.length === 0 ? (
        <button
          onClick={startCreate}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add a deal
        </button>
      ) : (
        <div className="space-y-0">
          {items.map((d) => (
            <div
              key={d.id}
              className="group flex items-center gap-2 py-1.5 -mx-1 px-1 rounded-sm hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      d.stage?.isLost && "line-through text-muted-foreground",
                    )}
                  >
                    {d.title}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] shrink-0", stageStyle(d.stage))}
                  >
                    {d.stage?.name ?? "Unknown"}
                  </Badge>
                </div>
              </div>
              <span className="text-xs font-medium tabular-nums shrink-0 text-muted-foreground">
                {formatCurrency(d.value)}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => startEdit(d)}
                >
                  <Pencil className="size-3" />
                </Button>
                <ConfirmDeleteButton
                  title="Delete deal?"
                  onConfirm={() => onDelete(d)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <DealDialog
        companyId={companyId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
