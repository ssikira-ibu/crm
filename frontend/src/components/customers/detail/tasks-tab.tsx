"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
import { updateTask, removeTask } from "@/app/actions/tasks";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/lib/types";
import { TaskDialog } from "./task-dialog";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "text-muted-foreground",
  NORMAL: "",
  HIGH: "text-amber-600 dark:text-amber-400",
  URGENT: "text-red-600 dark:text-red-400",
};

type Props = {
  companyId: string;
  items: Task[];
  onChanged: () => void;
};

type DisplayStatus = "overdue" | "upcoming" | "completed";

function displayStatusOf(t: Task): DisplayStatus {
  if (t.status === "DONE") return "completed";
  if (t.dueDate && isPast(new Date(t.dueDate))) return "overdue";
  return "upcoming";
}

function StatusIcon({ status }: { status: DisplayStatus }) {
  if (status === "overdue")
    return <AlertTriangle className="size-3.5 shrink-0 text-destructive" />;
  if (status === "completed")
    return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />;
  return <Clock className="size-3.5 shrink-0 text-muted-foreground" />;
}

export function TasksTab({ companyId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const rank: Record<DisplayStatus, number> = { overdue: 0, upcoming: 1, completed: 2 };
      const diff = rank[displayStatusOf(a)] - rank[displayStatusOf(b)];
      if (diff !== 0) return diff;
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [items]);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(t: Task) {
    setEditing(t);
    setOpen(true);
  }

  async function onToggle(t: Task, next: boolean) {
    setToggling((prev) => new Set(prev).add(t.id));
    try {
      await updateTask(companyId, t.id, {
        status: next ? "DONE" : "TODO",
      });
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setToggling((prev) => {
        const copy = new Set(prev);
        copy.delete(t.id);
        return copy;
      });
    }
  }

  async function onDelete(t: Task) {
    try {
      await removeTask(companyId, t.id);
      toast.success("Task deleted.");
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
          {items.length} task{items.length === 1 ? "" : "s"}
        </p>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          description="Set follow-ups so nothing slips through the cracks."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add task
            </Button>
          }
        />
      ) : (
        <div className="space-y-1.5">
          {sorted.map((t) => {
            const s = displayStatusOf(t);
            const completed = s === "completed";
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-start gap-3 rounded-lg border px-3 py-2.5",
                  s === "overdue" && "border-destructive/20 bg-destructive/5 dark:bg-destructive/10",
                  s === "completed" && "bg-muted/30",
                )}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={completed}
                  disabled={toggling.has(t.id)}
                  onCheckedChange={(v) => onToggle(t, v === true)}
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
                      {t.title}
                    </span>
                    {t.priority !== "NORMAL" && (
                      <Badge variant="secondary" className={cn("text-[10px] shrink-0", PRIORITY_STYLE[t.priority])}>
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                  {t.dueDate && (
                    <p
                      className={cn(
                        "mt-1 text-[11px]",
                        s === "overdue" ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {format(new Date(t.dueDate), "MMM d, yyyy 'at' h:mm a")} · {formatDistanceToNow(new Date(t.dueDate), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(t)}
                    aria-label="Edit task"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <ConfirmDeleteButton
                    title="Delete task?"
                    onConfirm={() => onDelete(t)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDialog
        companyId={companyId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
