"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import { PHONE_LABELS, type PhoneLabel, type PhoneNumber } from "@/lib/types";

type Props = {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PhoneNumber | null;
  onSaved: () => void;
};

export function PhoneDialog({
  customerId,
  open,
  onOpenChange,
  editing,
  onSaved,
}: Props) {
  const [label, setLabel] = useState<PhoneLabel>("WORK");
  const [number, setNumber] = useState("");
  const [extension, setExtension] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(editing?.label ?? "WORK");
    setNumber(editing?.number ?? "");
    setExtension(editing?.extension ?? "");
    setIsPrimary(editing?.isPrimary ?? false);
  }, [open, editing]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const input = {
        label,
        number: number.trim(),
        extension: extension.trim() || undefined,
        isPrimary,
      };
      if (editing) {
        await api.phoneNumbers.update(customerId, editing.id, input);
        toast.success("Phone number updated.");
      } else {
        await api.phoneNumbers.create(customerId, input);
        toast.success("Phone number added.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit phone number" : "New phone number"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phoneLabel">Label</Label>
              <Select
                value={label}
                onValueChange={(v) => setLabel(v as PhoneLabel)}
                disabled={pending}
              >
                <SelectTrigger id="phoneLabel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHONE_LABELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension">Extension</Label>
              <Input
                id="extension"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Number</Label>
            <Input
              id="number"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="+1 555 123 4567"
              disabled={pending}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isPrimary}
              onCheckedChange={(v) => setIsPrimary(v === true)}
              disabled={pending}
            />
            Primary number
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving
                </>
              ) : editing ? (
                "Save"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
