"use client";

import { useState } from "react";
import { Mail, Pencil, Phone, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { removeContact } from "@/app/actions/contacts";
import { describeError } from "@/lib/errors";
import type { Contact, PhoneNumber } from "@/lib/types";
import { ContactDialog } from "./contact-dialog";

type ContactWithPhones = Contact & { phoneNumbers: PhoneNumber[] };

type Props = {
  companyId: string;
  items: ContactWithPhones[];
  onChanged: () => void;
};

export function SidebarContacts({ companyId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContactWithPhones | null>(null);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(c: ContactWithPhones) {
    setEditing(c);
    setOpen(true);
  }

  async function onDelete(c: ContactWithPhones) {
    try {
      await removeContact(companyId, c.id);
      toast.success("Contact deleted.");
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
      throw err;
    }
  }

  return (
    <div className="border-b px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Contacts{items.length > 0 && ` (${items.length})`}
        </h3>
        <Button variant="ghost" size="icon-xs" onClick={startCreate}>
          <Plus className="size-3" />
        </Button>
      </div>

      {items.length === 0 ? (
        <button
          onClick={startCreate}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add a contact
        </button>
      ) : (
        <div className="space-y-0">
          {items.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-2 py-1.5 -mx-1 px-1 rounded-sm hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </span>
                  {c.isPrimary && (
                    <Star className="size-3 shrink-0 text-amber-500 fill-amber-500" />
                  )}
                </div>
                {c.jobTitle && (
                  <p className="truncate text-xs text-muted-foreground">
                    {c.jobTitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {c.email && (
                  <Button variant="ghost" size="icon-xs" asChild>
                    <a href={`mailto:${c.email}`} title={c.email}>
                      <Mail className="size-3" />
                    </a>
                  </Button>
                )}
                {c.phoneNumbers[0] && (
                  <Button variant="ghost" size="icon-xs" asChild>
                    <a href={`tel:${c.phoneNumbers[0].number}`} title={c.phoneNumbers[0].number}>
                      <Phone className="size-3" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => startEdit(c)}
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
        companyId={companyId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
