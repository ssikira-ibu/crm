"use client";

import { useState } from "react";
import { Mail, Pencil, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import type { Contact } from "@/lib/types";
import { ContactDialog } from "./contact-dialog";

type Props = {
  customerId: string;
  items: Contact[];
  onChanged: () => void;
};

export function ContactsTab({ customerId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(c: Contact) {
    setEditing(c);
    setOpen(true);
  }

  async function onDelete(c: Contact) {
    try {
      await api.contacts.remove(customerId, c.id);
      toast.success("Contact deleted.");
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
          {items.length} contact{items.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={startCreate}>
          <Plus className="size-4" />
          Add contact
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No contacts yet.
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {c.firstName} {c.lastName}
                  </span>
                  {c.isPrimary && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="size-3" /> Primary
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {c.jobTitle && <span>{c.jobTitle}</span>}
                  {c.email && (
                    <a
                      className="inline-flex items-center gap-1 hover:underline"
                      href={`mailto:${c.email}`}
                    >
                      <Mail className="size-3" />
                      {c.email}
                    </a>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startEdit(c)}
                aria-label="Edit contact"
              >
                <Pencil className="size-4" />
              </Button>
              <ConfirmDeleteButton
                title="Delete contact?"
                description={`${c.firstName} ${c.lastName} will be removed.`}
                onConfirm={() => onDelete(c)}
              />
            </li>
          ))}
        </ul>
      )}

      <ContactDialog
        customerId={customerId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
