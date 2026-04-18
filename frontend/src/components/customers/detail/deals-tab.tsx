"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { DollarSign, Pencil, Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
import { removeDeal } from "@/app/actions/deals";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Deal, DealStatus } from "@/lib/types";
import { DealDialog } from "./deal-dialog";

const STATUS_STYLE: Record<DealStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  WON: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  LOST: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_LABEL: Record<DealStatus, string> = {
  OPEN: "Open",
  WON: "Won",
  LOST: "Lost",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = {
  customerId: string;
  items: Deal[];
  onChanged: () => void;
};

export function DealsTab({ customerId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(d: Deal) {
    setEditing(d);
    setOpen(true);
  }

  async function onDelete(d: Deal) {
    try {
      await removeDeal(customerId, d.id);
      toast.success("Deal deleted.");
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
      throw err;
    }
  }

  const openDeals = items.filter((d) => d.status === "OPEN");
  const totalOpen = openDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {items.length} deal{items.length === 1 ? "" : "s"}
          </p>
          {totalOpen > 0 && (
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {formatCurrency(totalOpen)} open
            </p>
          )}
        </div>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No deals yet"
          description="Track opportunities and revenue for this customer."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add deal
            </Button>
          }
        />
      ) : (
        <div className="space-y-1.5">
          {items.map((d) => (
            <div
              key={d.id}
              className={cn(
                "group flex items-start gap-3 rounded-lg border px-3 py-2.5",
                d.status === "WON" && "bg-emerald-50/50 dark:bg-emerald-950/20",
                d.status === "LOST" && "bg-muted/30",
              )}
            >
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <DollarSign className="size-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      d.status === "LOST" && "line-through text-muted-foreground",
                    )}
                  >
                    {d.title}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] shrink-0", STATUS_STYLE[d.status])}
                  >
                    {STATUS_LABEL[d.status]}
                  </Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span className="font-medium tabular-nums">
                    {formatCurrency(d.value)}
                  </span>
                  {d.expectedCloseDate && (
                    <>
                      <span className="text-border">|</span>
                      <span>
                        Close{" "}
                        {format(new Date(d.expectedCloseDate), "MMM d, yyyy")}
                      </span>
                    </>
                  )}
                  <span className="text-border">|</span>
                  <span>
                    {formatDistanceToNow(new Date(d.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {d.description && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                    {d.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => startEdit(d)}
                  aria-label="Edit deal"
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
        customerId={customerId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
