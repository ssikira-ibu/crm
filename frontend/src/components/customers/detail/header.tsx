"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ExternalLink, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CompanyStatusBadge } from "@/components/customers/status-badge";
import { TagPicker } from "@/components/customers/detail/tag-picker";
import { updateCompany, removeCompany } from "@/app/actions/companies";
import { describeError } from "@/lib/errors";
import {
  COMPANY_STATUSES,
  type Company,
  type CompanyStatus,
  type CompanyWithRelations,
} from "@/lib/types";

const STATUS_LABEL: Record<CompanyStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  LEAD: "Lead",
  PROSPECT: "Prospect",
};

type Props = {
  customer: CompanyWithRelations;
  onUpdated: (company: Company) => void;
  onChanged: () => void;
};

function InlineField({
  value,
  field,
  placeholder,
  companyId,
  onUpdated,
  className,
}: {
  value: string;
  field: string;
  placeholder: string;
  companyId: string;
  onUpdated: (c: Company) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await updateCompany(companyId, { [field]: trimmed || undefined });
      onUpdated(res.data);
      setEditing(false);
      toast.success("Updated.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={onKeyDown}
          disabled={saving}
          className={`bg-transparent border-b border-foreground/20 outline-none focus:border-foreground/50 ${className ?? ""}`}
          placeholder={placeholder}
        />
        {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </span>
    );
  }

  return (
    <span
      onClick={startEdit}
      className={`cursor-pointer rounded px-0.5 -mx-0.5 transition-colors hover:bg-muted ${className ?? ""}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground/50">{placeholder}</span>}
    </span>
  );
}

export function CustomerHeader({ customer, onUpdated, onChanged }: Props) {
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function onDelete() {
    await removeCompany(customer.id);
    toast.success("Company deleted.");
    router.push("/customers");
  }

  async function onStatusChange(newStatus: string) {
    setStatusSaving(true);
    try {
      const res = await updateCompany(customer.id, { status: newStatus as CompanyStatus });
      onUpdated(res.data);
      toast.success("Status updated.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setStatusSaving(false);
      setStatusOpen(false);
    }
  }

  const displayName = customer.name?.trim() || "Untitled company";

  return (
    <div className="border-b px-6 py-4">
      <div className="flex items-center justify-between gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/customers">Companies</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{displayName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <ConfirmDeleteButton
              title="Delete company?"
              description="This will permanently remove the company and all related data."
              onConfirm={onDelete}
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  Delete company
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight">
            <InlineField
              value={customer.name ?? ""}
              field="name"
              placeholder="Company name"
              companyId={customer.id}
              onUpdated={onUpdated}
            />
          </h1>
          <DropdownMenu open={statusOpen} onOpenChange={setStatusOpen}>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer" disabled={statusSaving}>
                <CompanyStatusBadge status={customer.status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {COMPANY_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onSelect={() => onStatusChange(s)}
                  className={customer.status === s ? "font-medium" : ""}
                >
                  {STATUS_LABEL[s]}
                  {customer.status === s && <Check className="ml-auto size-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <InlineField
            value={customer.industry ?? ""}
            field="industry"
            placeholder="Add industry"
            companyId={customer.id}
            onUpdated={onUpdated}
            className="text-sm"
          />
          {customer.website ? (
            <a
              href={customer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              {customer.website.replace(/^https?:\/\//, "")}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <InlineField
              value=""
              field="website"
              placeholder="Add website"
              companyId={customer.id}
              onUpdated={onUpdated}
              className="text-sm"
            />
          )}
        </div>
        <div className="mt-2">
          <TagPicker
            companyId={customer.id}
            assigned={customer.tags}
            onChanged={onChanged}
          />
        </div>
      </div>
    </div>
  );
}
