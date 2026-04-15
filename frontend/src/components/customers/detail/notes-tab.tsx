"use client";

import { useState } from "react";
import { FileText, Pencil, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EmptyState } from "@/components/empty-state";
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
        <p className="text-xs text-muted-foreground">
          {items.length} note{items.length === 1 ? "" : "s"}
        </p>
        <Button size="xs" variant="outline" onClick={startCreate}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Capture conversations, meeting notes, and reminders."
          action={
            <Button size="sm" onClick={startCreate}>
              <Plus className="size-3.5" />
              Add note
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <article
              key={n.id}
              className="group rounded-lg border bg-card p-3 text-sm"
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">{n.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => startEdit(n)}
                    aria-label="Edit note"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <ConfirmDeleteButton
                    title="Delete note?"
                    onConfirm={() => onDelete(n)}
                  />
                </div>
              </header>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
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
