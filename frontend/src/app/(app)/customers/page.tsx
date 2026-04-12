"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { CustomerStatusBadge } from "@/components/customers/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, ApiError } from "@/lib/api";
import {
  CUSTOMER_STATUSES,
  type Customer,
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function describeName(c: Customer): string {
  return c.companyName?.trim() || "Untitled customer";
}

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
  const [customers, setCustomers] = useState<Customer[]>([]);
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} total` : "\u00A0"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New customer
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b p-4 sm:px-6">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or industry"
            className="pl-8"
            aria-label="Search customers"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[10rem]" aria-label="Filter by status">
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

      {error && !loading ? (
        <div className="p-4 sm:p-6">
          <Alert variant="destructive">
            <AlertTitle>Unable to load customers</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto">
        {!loading && !error && customers.length === 0 ? (
          <div className="p-4 sm:p-6">
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
                    <Plus className="size-4" />
                    New customer
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[14rem]">Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))
                : customers.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/customers/${c.id}`)}
                    >
                      <TableCell className="font-medium">
                        {describeName(c)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.industry ?? "—"}
                      </TableCell>
                      <TableCell>
                        <CustomerStatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between border-t p-3 text-sm sm:px-6">
        <div className="text-muted-foreground">
          {meta ? `Page ${meta.page} of ${meta.totalPages || 1}` : "\u00A0"}
        </div>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={!canPrev}
                className={
                  !canPrev ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (canPrev) setPage((p) => Math.max(1, p - 1));
                }}
                href="#"
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                aria-disabled={!canNext}
                className={
                  !canNext ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (canNext) setPage((p) => p + 1);
                }}
                href="#"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

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
