"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
import { removeAddress } from "@/app/actions/addresses";
import { describeError } from "@/lib/errors";
import type { Address } from "@/lib/types";
import { AddressDialog } from "./address-dialog";

type Props = {
  customerId: string;
  items: Address[];
  onChanged: () => void;
};

function formatAddress(a: Address): string {
  const parts = [a.street1];
  if (a.street2) parts.push(a.street2);
  parts.push(`${a.city}, ${a.state} ${a.zipCode}`);
  if (a.country && a.country !== "US") parts.push(a.country);
  return parts.join(" · ");
}

export function AddressesTab({ customerId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(a: Address) {
    setEditing(a);
    setOpen(true);
  }

  async function onDelete(a: Address) {
    try {
      await removeAddress(customerId, a.id);
      toast.success("Address deleted.");
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
          {items.length} address{items.length === 1 ? "" : "es"}
        </p>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses yet"
          description="Record main, billing, and shipping locations."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add address
            </Button>
          }
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((a) => (
            <div key={a.id} className="group flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <Badge variant="secondary" className="text-[10px]">{a.label}</Badge>
                <p className="mt-1 truncate text-sm">{formatAddress(a)}</p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => startEdit(a)}
                  aria-label="Edit address"
                >
                  <Pencil className="size-3" />
                </Button>
                <ConfirmDeleteButton
                  title="Delete address?"
                  onConfirm={() => onDelete(a)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <AddressDialog
        customerId={customerId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
