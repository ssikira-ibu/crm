"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CustomerStatusBadge } from "@/components/customers/status-badge";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import {
  CUSTOMER_STATUSES,
  type Customer,
  type CustomerStatus,
} from "@/lib/types";

type Props = {
  customer: Customer;
  onUpdated: (customer: Customer) => void;
};

export function CustomerHeader({ customer, onUpdated }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState(customer.companyName ?? "");
  const [industry, setIndustry] = useState(customer.industry ?? "");
  const [website, setWebsite] = useState(customer.website ?? "");
  const [status, setStatus] = useState<CustomerStatus>(customer.status);
  const [pending, setPending] = useState(false);

  function enterEdit() {
    setCompanyName(customer.companyName ?? "");
    setIndustry(customer.industry ?? "");
    setWebsite(customer.website ?? "");
    setStatus(customer.status);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await api.customers.update(customer.id, {
        companyName: companyName.trim() || undefined,
        industry: industry.trim() || undefined,
        website: website.trim() || undefined,
        status,
      });
      onUpdated(res.data);
      setEditing(false);
      toast.success("Customer updated.");
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    await api.customers.remove(customer.id);
    toast.success("Customer deleted.");
    router.push("/customers");
  }

  const displayName = customer.companyName?.trim() || "Untitled customer";

  return (
    <div className="border-b p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers">
            <ArrowLeft className="size-4" />
            Customers
          </Link>
        </Button>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={enterEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <ConfirmDeleteButton
              title="Delete customer?"
              description="This will permanently remove the customer and all related data."
              onConfirm={onDelete}
              trigger={
                <Button variant="outline" size="sm">
                  Delete
                </Button>
              }
            />
          </div>
        )}
      </div>

      {editing ? (
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editCompany">Company name</Label>
              <Input
                id="editCompany"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIndustry">Industry</Label>
              <Input
                id="editIndustry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editWebsite">Website</Label>
              <Input
                id="editWebsite"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CustomerStatus)}
                disabled={pending}
              >
                <SelectTrigger id="editStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEdit}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customer.industry && <span>{customer.industry}</span>}
            {customer.website && (
              <a
                href={customer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                {customer.website}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
