"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  FileText,
  ListTodo,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { getEventConfig } from "@/components/timeline";
import { getCompanyEvents } from "@/app/actions/events";
import { removeActivity } from "@/app/actions/activities";
import { removeNote } from "@/app/actions/notes";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType, EventWithCompany, Note } from "@/lib/types";
import { ActivityDialog } from "./activity-dialog";
import { NoteDialog } from "./note-dialog";
import { TaskDialog } from "./task-dialog";

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

type FeedItem =
  | { kind: "event"; data: EventWithCompany; ts: number }
  | { kind: "activity"; data: Activity; ts: number }
  | { kind: "note"; data: Note; ts: number };

function groupByDate(items: FeedItem[]): [string, FeedItem[]][] {
  const groups = new Map<string, FeedItem[]>();
  for (const item of items) {
    const d = new Date(item.ts);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else label = format(d, "EEEE, MMMM d");
    const existing = groups.get(label);
    if (existing) existing.push(item);
    else groups.set(label, [item]);
  }
  return Array.from(groups.entries());
}

type Props = {
  companyId: string;
  activities: Activity[];
  notes: Note[];
  reloadKey: number;
  onChanged: () => void;
};

export function ActivityFeed({ companyId, activities, notes, reloadKey, onChanged }: Props) {
  const [events, setEvents] = useState<EventWithCompany[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityDefaultType, setActivityDefaultType] = useState<ActivityType | undefined>();

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingEvents(true);
      try {
        const res = await getCompanyEvents(companyId, { limit: 50 });
        if (!cancelled) setEvents(res.data);
      } catch {
        if (!cancelled) toast.error("Failed to load timeline.");
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, reloadKey]);

  const mergedItems = useMemo(() => {
    const items: FeedItem[] = [
      ...events.map((e) => ({ kind: "event" as const, data: e, ts: new Date(e.createdAt).getTime() })),
      ...activities.map((a) => ({ kind: "activity" as const, data: a, ts: new Date(a.date).getTime() })),
      ...notes.map((n) => ({ kind: "note" as const, data: n, ts: new Date(n.updatedAt).getTime() })),
    ];
    items.sort((a, b) => b.ts - a.ts);
    return items;
  }, [events, activities, notes]);

  const groups = groupByDate(mergedItems);

  function openActivityDialog(type?: ActivityType) {
    setEditingActivity(null);
    setActivityDefaultType(type);
    setActivityDialogOpen(true);
  }

  async function onDeleteActivity(a: Activity) {
    try {
      await removeActivity(companyId, a.id);
      toast.success("Activity deleted.");
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
      throw err;
    }
  }

  async function onDeleteNote(n: Note) {
    try {
      await removeNote(companyId, n.id);
      toast.success("Note deleted.");
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
      throw err;
    }
  }

  return (
    <div className="px-6 py-4">
      {/* Quick action bar */}
      <div className="flex items-center gap-1 pb-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground"
          onClick={() => openActivityDialog("CALL")}
        >
          <Phone className="size-3" /> Log Call
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground"
          onClick={() => openActivityDialog("EMAIL")}
        >
          <Mail className="size-3" /> Email
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground"
          onClick={() => {
            setEditingNote(null);
            setNoteDialogOpen(true);
          }}
        >
          <FileText className="size-3" /> Note
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground"
          onClick={() => setTaskDialogOpen(true)}
        >
          <ListTodo className="size-3" /> Task
        </Button>
      </div>

      {/* Feed content */}
      {loadingEvents && mergedItems.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : mergedItems.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No activity yet. Use the buttons above to get started.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map(([dateLabel, items]) => (
            <section key={dateLabel}>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                {dateLabel}
              </h3>
              <div className="relative space-y-0">
                <div className="absolute left-[13px] top-3 bottom-3 w-px bg-border" />
                {items.map((item) => {
                  if (item.kind === "event") {
                    const e = item.data;
                    const config = getEventConfig(e);
                    const Icon = config.icon;
                    const desc = config.describe(e);
                    const dateObj = new Date(e.createdAt);
                    return (
                      <div
                        key={`ev-${e.id}`}
                        className="relative flex items-start gap-3 py-2 pl-0.5"
                      >
                        <div
                          className={cn(
                            "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
                            config.style,
                          )}
                        >
                          <Icon className="size-3" />
                        </div>
                        <div className="min-w-0 flex-1 pt-px">
                          <p className="text-sm">{desc}</p>
                          <span className="text-[11px] text-muted-foreground">
                            {format(dateObj, "h:mm a")} · {formatDistanceToNow(dateObj, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === "activity") {
                    const a = item.data;
                    const Icon = TYPE_ICON[a.type];
                    const dateObj = new Date(a.date);
                    return (
                      <div
                        key={`act-${a.id}`}
                        className="group relative flex items-start gap-3 py-2 pl-0.5"
                      >
                        <div
                          className={cn(
                            "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
                            TYPE_STYLE[a.type],
                          )}
                        >
                          <Icon className="size-3" />
                        </div>
                        <div className="min-w-0 flex-1 pt-px">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{a.title}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {TYPE_LABEL[a.type]}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {format(dateObj, "h:mm a")} · {formatDistanceToNow(dateObj, { addSuffix: true })}
                          </span>
                          {a.description && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground line-clamp-2">
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
                              setActivityDefaultType(undefined);
                              setActivityDialogOpen(true);
                            }}
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

                  // note
                  const n = item.data;
                  return (
                    <div
                      key={`note-${n.id}`}
                      className="group relative flex items-start gap-3 py-2 pl-0.5"
                    >
                      <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                        <FileText className="size-3" />
                      </div>
                      <div className="min-w-0 flex-1 pt-px">
                        <span className="text-sm font-medium">{n.title}</span>
                        <p className="text-[11px] text-muted-foreground">
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
            </section>
          ))}
        </div>
      )}

      <ActivityDialog
        companyId={companyId}
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        editing={editingActivity}
        defaultType={activityDefaultType}
        onSaved={onChanged}
      />
      <NoteDialog
        companyId={companyId}
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        editing={editingNote}
        onSaved={onChanged}
      />
      <TaskDialog
        companyId={companyId}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        editing={null}
        onSaved={onChanged}
      />
    </div>
  );
}
