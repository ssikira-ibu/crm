"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ADDRESS_LABELS, type Address, type AddressLabel } from "@/lib/types";

type Props = {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Address | null;
  onSaved: () => void;
};

export function AddressDialog({
  customerId,
  open,
  onOpenChange,
  editing,
  onSaved,
}: Props) {
  const [label, setLabel] = useState<AddressLabel>("MAIN");
  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("US");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel(editing?.label ?? "MAIN");
    setStreet1(editing?.street1 ?? "");
    setStreet2(editing?.street2 ?? "");
    setCity(editing?.city ?? "");
    setState(editing?.state ?? "");
    setZipCode(editing?.zipCode ?? "");
    setCountry(editing?.country ?? "US");
  }, [open, editing]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const input = {
        label,
        street1: street1.trim(),
        street2: street2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        country: country.trim() || undefined,
      };
      if (editing) {
        await api.addresses.update(customerId, editing.id, input);
        toast.success("Address updated.");
      } else {
        await api.addresses.create(customerId, input);
        toast.success("Address added.");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit address" : "New address"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Select
              value={label}
              onValueChange={(v) => setLabel(v as AddressLabel)}
              disabled={pending}
            >
              <SelectTrigger id="label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDRESS_LABELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="street1">Street 1</Label>
            <Input
              id="street1"
              required
              value={street1}
              onChange={(e) => setStreet1(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street2">Street 2</Label>
            <Input
              id="street2"
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip code</Label>
              <Input
                id="zipCode"
                required
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>
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
