"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { CustomerStatusBadge } from "@/components/customers/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_STATUSES,
  type CustomerWithCounts,
  type CustomerStatus,
  type PageMeta,
} from "@/lib/types";

const PAGE_SIZE = 20;
const ANY = "ANY" as const;
type StatusFilter = CustomerStatus | typeof ANY;

const STATUS_LABEL: Record<CustomerStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  LEAD: "Lead",
  PROSPECT: "Prospect",
};

function describe(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Failed to load customers.";
}

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ANY);
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<CustomerWithCounts[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api.customers
      .list(
        {
          page,
          limit: PAGE_SIZE,
          status: statusFilter === ANY ? undefined : statusFilter,
          search: debouncedSearch.trim() || undefined,
        },
        ctrl.signal,
      )
      .then((res) => {
        setCustomers(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        const msg = describe(err);
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [page, debouncedSearch, statusFilter, reloadKey]);

  const totalPages = meta?.totalPages ?? 1;
  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;
  const hasFilters =
    debouncedSearch.trim().length > 0 || statusFilter !== ANY;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} total` : "\u00A0"}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New customer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b px-6 py-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-7 pl-8 text-sm"
            aria-label="Search customers"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-7 w-[8rem] text-sm" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All statuses</SelectItem>
            {CUSTOMER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {error && !loading ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="Unable to load customers"
              description={error}
            />
          </div>
        ) : !loading && !error && customers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={hasFilters ? "No matching customers" : "No customers yet"}
              description={
                hasFilters
                  ? "Try adjusting your search or filters."
                  : "Add your first customer to start tracking relationships."
              }
              action={
                !hasFilters ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-3.5" />
                    New customer
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="divide-y">
            {loading && customers.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={`sk-${i}`} className="flex items-center gap-4 px-6 py-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                    <div className="flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              : customers.map((c) => (
                  <div
                    key={c.id}
                    className="group flex cursor-pointer items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/customers/${c.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="truncate text-sm font-medium">
                          {c.companyName?.trim() || "Untitled customer"}
                        </span>
                        <CustomerStatusBadge status={c.status} />
                      </div>
                      {c.industry && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {c.industry}
                        </p>
                      )}
                    </div>
                    <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
                      {c._count.contacts > 0 && (
                        <span>{c._count.contacts} contact{c._count.contacts !== 1 ? "s" : ""}</span>
                      )}
                      {c._count.notes > 0 && (
                        <span>{c._count.notes} note{c._count.notes !== 1 ? "s" : ""}</span>
                      )}
                      {c._count.reminders > 0 && (
                        <span>{c._count.reminders} reminder{c._count.reminders !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
                  </div>
                ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-6 py-2.5 text-xs text-muted-foreground">
          <span>
            Page {meta?.page ?? 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <CreateCustomerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(c) => {
          setReloadKey((k) => k + 1);
          router.push(`/customers/${c.id}`);
        }}
      />
    </div>
  );
}
