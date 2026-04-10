"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import type { Address } from "@/lib/types";
import { AddressDialog } from "./address-dialog";

type Props = {
  customerId: string;
  items: Address[];
  onChanged: () => void;
};

function formatAddress(a: Address): string {
  const lines = [a.street1];
  if (a.street2) lines.push(a.street2);
  lines.push(`${a.city}, ${a.state} ${a.zipCode}`);
  if (a.country && a.country !== "US") lines.push(a.country);
  return lines.join(" · ");
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
      await api.addresses.remove(customerId, a.id);
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
        <p className="text-sm text-muted-foreground">
          {items.length} address{items.length === 1 ? "" : "es"}
        </p>
        <Button size="sm" onClick={startCreate}>
          <Plus className="size-4" />
          Add address
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No addresses yet.
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{a.label}</Badge>
                </div>
                <div className="mt-1 truncate text-sm">{formatAddress(a)}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startEdit(a)}
                aria-label="Edit address"
              >
                <Pencil className="size-4" />
              </Button>
              <ConfirmDeleteButton
                title="Delete address?"
                onConfirm={() => onDelete(a)}
              />
            </li>
          ))}
        </ul>
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
