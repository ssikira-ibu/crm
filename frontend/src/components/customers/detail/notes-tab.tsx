"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import type { Note } from "@/lib/types";
import { NoteDialog } from "./note-dialog";

type Props = {
  customerId: string;
  items: Note[];
  onChanged: () => void;
};

export function NotesTab({ customerId, items, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(n: Note) {
    setEditing(n);
    setOpen(true);
  }

  async function onDelete(n: Note) {
    try {
      await api.notes.remove(customerId, n.id);
      toast.success("Note deleted.");
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
          {items.length} note{items.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={startCreate}>
          <Plus className="size-4" />
          Add note
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No notes yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <article
              key={n.id}
              className="rounded-md border bg-card p-4 text-sm"
            >
              <header className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{n.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(n)}
                    aria-label="Edit note"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDeleteButton
                    title="Delete note?"
                    onConfirm={() => onDelete(n)}
                  />
                </div>
              </header>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {n.body}
              </p>
            </article>
          ))}
        </div>
      )}

      <NoteDialog
        customerId={customerId}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={onChanged}
      />
    </div>
  );
}
