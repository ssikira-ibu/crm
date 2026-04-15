"use client";

import { useState } from "react";
import { Contact as ContactIcon, Mail, Pencil, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
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
        <p className="text-xs text-muted-foreground">
          {items.length} contact{items.length === 1 ? "" : "s"}
        </p>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ContactIcon}
          title="No contacts yet"
          description="Add people you work with at this company."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add contact
            </Button>
          }
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((c) => (
            <div key={c.id} className="group flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </span>
                  {c.isPrimary && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Star className="size-2.5" /> Primary
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {c.jobTitle && <span>{c.jobTitle}</span>}
                  {c.email && (
                    <a
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      href={`mailto:${c.email}`}
                    >
                      <Mail className="size-3" />
                      {c.email}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => startEdit(c)}
                  aria-label="Edit contact"
                >
                  <Pencil className="size-3" />
                </Button>
                <ConfirmDeleteButton
                  title="Delete contact?"
                  description={`${c.firstName} ${c.lastName} will be removed.`}
                  onConfirm={() => onDelete(c)}
                />
              </div>
            </div>
          ))}
        </div>
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
