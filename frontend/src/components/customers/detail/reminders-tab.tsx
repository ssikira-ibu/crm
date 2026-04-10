"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { api } from "@/lib/api";
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

const STATUS_STYLES: Record<Status, string> = {
  overdue: "border-destructive/40 bg-destructive/5",
  upcoming: "border-border bg-card",
  completed: "border-border bg-muted/40",
};

function StatusIcon({ status }: { status: Status }) {
  const common = "size-4 shrink-0";
  if (status === "overdue")
    return <AlertTriangle className={cn(common, "text-destructive")} />;
  if (status === "completed")
    return <CheckCircle2 className={cn(common, "text-emerald-600 dark:text-emerald-400")} />;
  return <Clock className={cn(common, "text-muted-foreground")} />;
}

export function RemindersTab({ customerId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const sa = statusOf(a);
      const sb = statusOf(b);
      const rank: Record<Status, number> = {
        overdue: 0,
        upcoming: 1,
        completed: 2,
      };
      if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
      return (
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
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
      await api.reminders.update(customerId, r.id, {
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
      await api.reminders.remove(customerId, r.id);
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
        <p className="text-sm text-muted-foreground">
          {items.length} reminder{items.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={startCreate}>
          <Plus className="size-4" />
          Add reminder
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No reminders yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((r) => {
            const s = statusOf(r);
            const due = new Date(r.dueDate);
            const completed = s === "completed";
            return (
              <li
                key={r.id}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-3",
                  STATUS_STYLES[s],
                )}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={completed}
                  disabled={toggling.has(r.id)}
                  onCheckedChange={(v) => onToggle(r, v === true)}
                  aria-label={completed ? "Mark pending" : "Mark completed"}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={s} />
                    <span
                      className={cn(
                        "truncate font-medium",
                        completed && "line-through text-muted-foreground",
                      )}
                    >
                      {r.title}
                    </span>
                  </div>
                  {r.description && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      s === "overdue"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {format(due, "PPp")} · {formatDistanceToNow(due, { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit(r)}
                  aria-label="Edit reminder"
                >
                  <Pencil className="size-4" />
                </Button>
                <ConfirmDeleteButton
                  title="Delete reminder?"
                  onConfirm={() => onDelete(r)}
                />
              </li>
            );
          })}
        </ul>
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
