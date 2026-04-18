"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  TrendingUp,
  Users,
  Zap,
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
  ActivityType,
  ActivityWithCustomer,
  DashboardData,
  DealWithCustomer,
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

const ACTIVITY_TYPE_ICON: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  OTHER: MoreHorizontal,
};

const ACTIVITY_TYPE_STYLE: Record<ActivityType, string> = {
  CALL: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  EMAIL: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  MEETING: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  OTHER: "bg-muted text-muted-foreground",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ActivityRow({ activity }: { activity: ActivityWithCustomer }) {
  const Icon = ACTIVITY_TYPE_ICON[activity.type];
  return (
    <Link
      href={`/customers/${activity.customerId}`}
      className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
          ACTIVITY_TYPE_STYLE[activity.type],
        )}
      >
        <Icon className="size-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{activity.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{activity.customer.companyName ?? "Untitled"}</span>
          <span className="text-border">|</span>
          <span>
            {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}

function DealRow({ deal }: { deal: DealWithCustomer }) {
  return (
    <Link
      href={`/customers/${deal.customerId}`}
      className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{deal.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {deal.customer.companyName ?? "Untitled"}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums text-blue-600 dark:text-blue-400">
        {formatCurrency(deal.value)}
      </span>
    </Link>
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
  const openDealsValue = data?.stats.openDealsValue ?? 0;
  const openDealsCount = data?.stats.openDealsCount ?? 0;
  const openDeals = data?.deals?.filter((d) => d.status === "OPEN") ?? [];
  const recentActivities = data?.recentActivities ?? [];

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
            <StatCard
              label="Pipeline"
              value={openDealsCount}
              icon={TrendingUp}
              href="/deals"
            />
          </div>

          {/* Pipeline + Activity side by side */}
          {(openDeals.length > 0 || recentActivities.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pipeline Snapshot */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4 text-blue-500" />
                    <h2 className="text-sm font-medium">Open pipeline</h2>
                  </div>
                  {openDealsValue > 0 && (
                    <span className="text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                      {formatCurrency(openDealsValue)}
                    </span>
                  )}
                </div>
                {openDeals.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No open deals.{" "}
                      <Link href="/deals" className="underline hover:text-foreground">
                        View all deals
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    {openDeals.slice(0, 5).map((d) => (
                      <DealRow key={d.id} deal={d} />
                    ))}
                    {openDeals.length > 5 && (
                      <Link
                        href="/deals"
                        className="flex items-center justify-center border-t px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View all {openDeals.length} deals
                        <ArrowRight className="ml-1 size-3" />
                      </Link>
                    )}
                  </div>
                )}
              </section>

              {/* Recent Activity */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-amber-500" />
                    <h2 className="text-sm font-medium">Recent activity</h2>
                  </div>
                  <Link
                    href="/activity"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View all
                  </Link>
                </div>
                {recentActivities.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No activity yet. Log interactions from customer pages.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    {recentActivities.slice(0, 5).map((a) => (
                      <ActivityRow key={a.id} activity={a} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

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
