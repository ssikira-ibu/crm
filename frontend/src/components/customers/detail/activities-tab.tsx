"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
import { removeActivity } from "@/app/actions/activities";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType } from "@/lib/types";
import { ActivityDialog } from "./activity-dialog";

const TYPE_ICON: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  OTHER: MoreHorizontal,
};

const TYPE_LABEL: Record<ActivityType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  OTHER: "Other",
};

const TYPE_STYLE: Record<ActivityType, string> = {
  CALL: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  EMAIL: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  MEETING: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  OTHER: "bg-muted text-muted-foreground",
};

type Props = {
  customerId: string;
  items: Activity[];
  onChanged: () => void;
};

export function ActivitiesTab({ customerId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [items],
  );

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(a: Activity) {
    setEditing(a);
    setOpen(true);
  }

  async function onDelete(a: Activity) {
    try {
      await removeActivity(customerId, a.id);
      toast.success("Activity deleted.");
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
          {items.length} activit{items.length === 1 ? "y" : "ies"}
        </p>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Log
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No activities yet"
          description="Log calls, emails, and meetings to build a timeline."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Log activity
            </Button>
          }
        />
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[17px] top-3 bottom-3 w-px bg-border" />
          {sorted.map((a) => {
            const Icon = TYPE_ICON[a.type];
            const dateObj = new Date(a.date);
            return (
              <div
                key={a.id}
                className="group relative flex items-start gap-3 py-2.5 pl-1"
              >
                <div
                  className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                    TYPE_STYLE[a.type],
                  )}
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {a.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {TYPE_LABEL[a.type]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {format(dateObj, "MMM d, yyyy 'at' h:mm a")} ·{" "}
                    {formatDistanceToNow(dateObj, { addSuffix: true })}
                  </p>
                  {a.description && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(a)}
                    aria-label="Edit activity"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <ConfirmDeleteButton
                    title="Delete activity?"
                    onConfirm={() => onDelete(a)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActivityDialog
        customerId={customerId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
