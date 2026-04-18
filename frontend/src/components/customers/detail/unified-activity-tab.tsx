"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  FileText,
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
import { removeNote } from "@/app/actions/notes";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType, Note } from "@/lib/types";
import { ActivityDialog } from "./activity-dialog";
import { NoteDialog } from "./note-dialog";

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

type UnifiedItem =
  | { kind: "activity"; data: Activity; sortDate: number }
  | { kind: "note"; data: Note; sortDate: number };

type Props = {
  customerId: string;
  activities: Activity[];
  notes: Note[];
  onChanged: () => void;
};

export function UnifiedActivityTab({ customerId, activities, notes, onChanged }: Props) {
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const items = useMemo(() => {
    const merged: UnifiedItem[] = [
      ...activities.map((a) => ({
        kind: "activity" as const,
        data: a,
        sortDate: new Date(a.date).getTime(),
      })),
      ...notes.map((n) => ({
        kind: "note" as const,
        data: n,
        sortDate: new Date(n.updatedAt).getTime(),
      })),
    ];
    merged.sort((a, b) => b.sortDate - a.sortDate);
    return merged;
  }, [activities, notes]);

  async function onDeleteActivity(a: Activity) {
    try {
      await removeActivity(customerId, a.id);
      toast.success("Activity deleted.");
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
      throw err;
    }
  }

  async function onDeleteNote(n: Note) {
    try {
      await removeNote(customerId, n.id);
      toast.success("Note deleted.");
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
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setEditingNote(null);
              setNoteDialogOpen(true);
            }}
          >
            <Plus className="size-3" />
            Note
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setEditingActivity(null);
              setActivityDialogOpen(true);
            }}
          >
            <Plus className="size-3" />
            Log
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No activity yet"
          description="Log calls, emails, meetings, or add notes to build a history."
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingNote(null);
                  setNoteDialogOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                Add note
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingActivity(null);
                  setActivityDialogOpen(true);
                }}
              >
                <Plus className="size-3.5" />
                Log activity
              </Button>
            </div>
          }
        />
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[17px] top-3 bottom-3 w-px bg-border" />
          {items.map((item) => {
            if (item.kind === "activity") {
              const a = item.data;
              const Icon = TYPE_ICON[a.type];
              const dateObj = new Date(a.date);
              return (
                <div
                  key={`a-${a.id}`}
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
                      <span className="truncate text-sm font-medium">{a.title}</span>
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
                      onClick={() => {
                        setEditingActivity(a);
                        setActivityDialogOpen(true);
                      }}
                      aria-label="Edit activity"
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <ConfirmDeleteButton
                      title="Delete activity?"
                      onConfirm={() => onDeleteActivity(a)}
                    />
                  </div>
                </div>
              );
            }

            const n = item.data;
            return (
              <div
                key={`n-${n.id}`}
                className="group relative flex items-start gap-3 py-2.5 pl-1"
              >
                <div className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                  <FileText className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <span className="text-sm font-medium">{n.title}</span>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.updatedAt), { addSuffix: true })}
                  </p>
                  {n.body && (
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setEditingNote(n);
                      setNoteDialogOpen(true);
                    }}
                    aria-label="Edit note"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <ConfirmDeleteButton
                    title="Delete note?"
                    onConfirm={() => onDeleteNote(n)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActivityDialog
        customerId={customerId}
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        editing={editingActivity}
        onSaved={onChanged}
      />
      <NoteDialog
        customerId={customerId}
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        editing={editingNote}
        onSaved={onChanged}
      />
    </div>
  );
}
