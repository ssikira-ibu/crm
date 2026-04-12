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
  items: PhoneNumber[];
  onChanged: () => void;
};

export function PhonesTab({ customerId, items, onChanged }: Props) {
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
      await api.phoneNumbers.remove(customerId, p.id);
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
        <p className="text-sm text-muted-foreground">
          {items.length} number{items.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={startCreate}>
          <Plus className="size-4" />
          Add number
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No phone numbers yet"
          description="Keep work, mobile, and other numbers in one place."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-4" />
              Add number
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{p.label}</Badge>
                  {p.isPrimary && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="size-3" /> Primary
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Phone className="size-3 text-muted-foreground" />
                  <a className="hover:underline" href={`tel:${p.number}`}>
                    {p.number}
                  </a>
                  {p.extension && (
                    <span className="text-muted-foreground">
                      ext. {p.extension}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startEdit(p)}
                aria-label="Edit phone"
              >
                <Pencil className="size-4" />
              </Button>
              <ConfirmDeleteButton
                title="Delete phone number?"
                onConfirm={() => onDelete(p)}
              />
            </li>
          ))}
        </ul>
      )}

      <PhoneDialog
        customerId={customerId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
