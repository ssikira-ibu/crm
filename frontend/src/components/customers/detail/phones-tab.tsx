"use client";

import { useState } from "react";
import { Pencil, Phone, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import type { PhoneNumber } from "@/lib/types";
import { PhoneDialog } from "./phone-dialog";

type Props = {
  customerId: string;
  contactId: string;
  items: PhoneNumber[];
  onChanged: () => void;
};

export function PhonesTab({ customerId, contactId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PhoneNumber | null>(null);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(p: PhoneNumber) {
    setEditing(p);
    setOpen(true);
  }

  async function onDelete(p: PhoneNumber) {
    try {
      await api.phoneNumbers.remove(customerId, contactId, p.id);
      toast.success("Phone number deleted.");
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
          {items.length} number{items.length === 1 ? "" : "s"}
        </p>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No phone numbers yet"
          description="Keep work, mobile, and other numbers in one place."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add number
            </Button>
          }
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((p) => (
            <div key={p.id} className="group flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{p.label}</Badge>
                  {p.isPrimary && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Star className="size-2.5" /> Primary
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Phone className="size-3 text-muted-foreground" />
                  <a className="hover:text-foreground transition-colors" href={`tel:${p.number}`}>
                    {p.number}
                  </a>
                  {p.extension && (
                    <span className="text-muted-foreground text-xs">
                      ext. {p.extension}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => startEdit(p)}
                  aria-label="Edit phone"
                >
                  <Pencil className="size-3" />
                </Button>
                <ConfirmDeleteButton
                  title="Delete phone number?"
                  onConfirm={() => onDelete(p)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <PhoneDialog
        customerId={customerId}
        contactId={contactId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
