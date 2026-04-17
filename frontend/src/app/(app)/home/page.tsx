"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getDashboard } from "@/app/actions/dashboard";
import { updateReminder } from "@/app/actions/reminders";
import { cn } from "@/lib/utils";
import type {
  DashboardData,
  NoteWithCustomer,
  ReminderWithCustomer,
} from "@/lib/types";

function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load dashboard.";
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return { data, loading, refresh: () => setReloadKey((k) => k + 1) };
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <div className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function ReminderRow({
  reminder,
  onToggle,
}: {
  reminder: ReminderWithCustomer;
  onToggle: (r: ReminderWithCustomer) => void;
}) {
  const due = new Date(reminder.dueDate);
  const overdue = isPast(due) && !reminder.dateCompleted;
  const today = isToday(due);

  return (
    <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50">
      <Checkbox
        className="mt-0.5"
        checked={!!reminder.dateCompleted}
        onCheckedChange={() => onToggle(reminder)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {overdue && <AlertTriangle className="size-3.5 text-destructive shrink-0" />}
          {!overdue && today && <Clock className="size-3.5 text-amber-500 shrink-0" />}
          <span className="truncate text-sm font-medium">{reminder.title}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/customers/${reminder.customer.id}`}
            className="hover:text-foreground transition-colors"
          >
            {reminder.customer.companyName || "Untitled"}
          </Link>
          <span className="text-border">|</span>
          <span className={cn(overdue && "text-destructive")}>
            {format(due, "MMM d")} · {formatDistanceToNow(due, { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

function NoteRow({ note }: { note: NoteWithCustomer }) {
  return (
    <Link
      href={`/customers/${note.customer.id}`}
      className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{note.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{note.customer.companyName || "Untitled"}</span>
          <span className="text-border">|</span>
          <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data, loading, refresh } = useDashboard();

  async function handleToggle(r: ReminderWithCustomer) {
    try {
      await updateReminder(r.customer.id, r.id, {
        dateCompleted: r.dateCompleted ? null : new Date().toISOString(),
      });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update reminder.");
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overdueReminders = data?.reminders.filter(
    (r) => isPast(new Date(r.dueDate)) && !r.dateCompleted,
  ) ?? [];
  const upcomingReminders = data?.reminders.filter(
    (r) => !isPast(new Date(r.dueDate)) && !r.dateCompleted,
  ) ?? [];
  const totalCustomers = data?.stats.total ?? 0;
  const activeCount = data?.stats.byStatus?.ACTIVE ?? 0;
  const leadCount = data?.stats.byStatus?.LEAD ?? 0;
  const prospectCount = data?.stats.byStatus?.PROSPECT ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight">Home</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your workspace overview
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total customers"
              value={totalCustomers}
              icon={Users}
              href="/customers"
            />
            <StatCard label="Active" value={activeCount} icon={CheckCircle2} />
            <StatCard label="Leads" value={leadCount} icon={Clock} />
            <StatCard label="Prospects" value={prospectCount} icon={ArrowRight} />
          </div>

          {/* Overdue */}
          {overdueReminders.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                <h2 className="text-sm font-medium">
                  Overdue ({overdueReminders.length})
                </h2>
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 dark:bg-destructive/10">
                {overdueReminders.map((r) => (
                  <ReminderRow key={r.id} reminder={r} onToggle={handleToggle} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <Bell className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">
                Upcoming reminders
                {upcomingReminders.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {upcomingReminders.length}
                  </Badge>
                )}
              </h2>
            </div>
            {upcomingReminders.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No upcoming reminders. You're all caught up.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border">
                {upcomingReminders.slice(0, 10).map((r) => (
                  <ReminderRow key={r.id} reminder={r} onToggle={handleToggle} />
                ))}
                {upcomingReminders.length > 10 && (
                  <div className="border-t px-3 py-2 text-center">
                    <span className="text-xs text-muted-foreground">
                      +{upcomingReminders.length - 10} more
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Recent notes</h2>
            </div>
            {(!data?.recentNotes || data.recentNotes.length === 0) ? (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No notes yet. Add notes to customers to see activity here.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border">
                {data.recentNotes.map((n) => (
                  <NoteRow key={n.id} note={n} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
