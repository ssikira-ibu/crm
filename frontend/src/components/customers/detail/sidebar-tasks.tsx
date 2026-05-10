"use client";

import { useMemo, useState } from "react";
import { format, isPast } from "date-fns";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
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

type DisplayStatus = "overdue" | "upcoming" | "completed";

function displayStatusOf(t: Task): DisplayStatus {
  if (t.status === "DONE") return "completed";
  if (t.dueDate && isPast(new Date(t.dueDate))) return "overdue";
  return "upcoming";
}

type Props = {
  companyId: string;
  items: Task[];
  onChanged: () => void;
};

export function SidebarTasks({ companyId, items, onChanged }: Props) {
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
      await updateTask(companyId, t.id, { status: next ? "DONE" : "TODO" });
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
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tasks{items.length > 0 && ` (${items.length})`}
        </h3>
        <Button variant="ghost" size="icon-xs" onClick={startCreate}>
          <Plus className="size-3" />
        </Button>
      </div>

      {sorted.length === 0 ? (
        <button
          onClick={startCreate}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add a task
        </button>
      ) : (
        <div className="space-y-0">
          {sorted.map((t) => {
            const s = displayStatusOf(t);
            const completed = s === "completed";
            return (
              <div
                key={t.id}
                className="group flex items-center gap-2 py-1.5 -mx-1 px-1 rounded-sm hover:bg-muted/50"
              >
                <Checkbox
                  className="size-3.5 shrink-0"
                  checked={completed}
                  disabled={toggling.has(t.id)}
                  onCheckedChange={(v) => onToggle(t, v === true)}
                />
                <span
                  className={cn(
                    "truncate text-sm flex-1",
                    completed && "line-through text-muted-foreground",
                    s === "overdue" && "text-destructive",
                  )}
                >
                  {t.title}
                </span>
                {t.priority !== "NORMAL" && (
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] shrink-0", PRIORITY_STYLE[t.priority])}
                  >
                    {PRIORITY_LABEL[t.priority]}
                  </Badge>
                )}
                {t.dueDate && (
                  <span
                    className={cn(
                      "text-[11px] shrink-0",
                      s === "overdue" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {format(new Date(t.dueDate), "MMM d")}
                  </span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(t)}
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
