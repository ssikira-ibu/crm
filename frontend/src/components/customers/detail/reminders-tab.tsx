"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
import { updateReminder, removeReminder } from "@/app/actions/reminders";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/lib/types";
import { ReminderDialog } from "./reminder-dialog";

type Props = {
  customerId: string;
  items: Reminder[];
  onChanged: () => void;
};

type Status = "overdue" | "upcoming" | "completed";

function statusOf(r: Reminder): Status {
  if (r.dateCompleted) return "completed";
  return isPast(new Date(r.dueDate)) ? "overdue" : "upcoming";
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "overdue")
    return <AlertTriangle className="size-3.5 shrink-0 text-destructive" />;
  if (status === "completed")
    return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  return <Clock className="size-3.5 shrink-0 text-muted-foreground" />;
}

export function RemindersTab({ customerId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const rank: Record<Status, number> = { overdue: 0, upcoming: 1, completed: 2 };
      const diff = rank[statusOf(a)] - rank[statusOf(b)];
      if (diff !== 0) return diff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [items]);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(r: Reminder) {
    setEditing(r);
    setOpen(true);
  }

  async function onToggle(r: Reminder, next: boolean) {
    setToggling((prev) => new Set(prev).add(r.id));
    try {
      await updateReminder(customerId, r.id, {
        dateCompleted: next ? new Date().toISOString() : null,
      });
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setToggling((prev) => {
        const copy = new Set(prev);
        copy.delete(r.id);
        return copy;
      });
    }
  }

  async function onDelete(r: Reminder) {
    try {
      await removeReminder(customerId, r.id);
      toast.success("Reminder deleted.");
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
      throw err;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {items.length} reminder{items.length === 1 ? "" : "s"}
        </p>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No reminders yet"
          description="Set follow-ups so nothing slips through the cracks."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add reminder
            </Button>
          }
        />
      ) : (
        <div className="space-y-1.5">
          {sorted.map((r) => {
            const s = statusOf(r);
            const due = new Date(r.dueDate);
            const completed = s === "completed";
            return (
              <div
                key={r.id}
                className={cn(
                  "group flex items-start gap-3 rounded-lg border px-3 py-2.5",
                  s === "overdue" && "border-destructive/20 bg-destructive/5 dark:bg-destructive/10",
                  s === "completed" && "bg-muted/30",
                )}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={completed}
                  disabled={toggling.has(r.id)}
                  onCheckedChange={(v) => onToggle(r, v === true)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={s} />
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        completed && "line-through text-muted-foreground",
                      )}
                    >
                      {r.title}
                    </span>
                  </div>
                  {r.description && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      s === "overdue" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {format(due, "MMM d, yyyy 'at' h:mm a")} · {formatDistanceToNow(due, { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(r)}
                    aria-label="Edit reminder"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <ConfirmDeleteButton
                    title="Delete reminder?"
                    onConfirm={() => onDelete(r)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReminderDialog
        customerId={customerId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
