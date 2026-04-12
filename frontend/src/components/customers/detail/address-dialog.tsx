"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

const schema = z.object({
  label: z.enum(ADDRESS_LABELS),
  street1: z.string().trim().min(1, "Street is required."),
  street2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required."),
  state: z.string().trim().min(1, "State is required."),
  zipCode: z.string().trim().min(1, "Zip code is required."),
  country: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

function toValues(editing: Address | null): FormValues {
  return {
    label: editing?.label ?? "MAIN",
    street1: editing?.street1 ?? "",
    street2: editing?.street2 ?? "",
    city: editing?.city ?? "",
    state: editing?.state ?? "",
    zipCode: editing?.zipCode ?? "",
    country: editing?.country ?? "US",
  };
}

export function AddressDialog({
  customerId,
  open,
  onOpenChange,
  editing,
  onSaved,
}: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(editing),
  });
  const pending = form.formState.isSubmitting;

  useEffect(() => {
    if (open) form.reset(toValues(editing));
  }, [open, editing, form]);

  async function onSubmit(values: FormValues) {
    try {
      const input = {
        label: values.label,
        street1: values.street1.trim(),
        street2: values.street2?.trim() || undefined,
        city: values.city.trim(),
        state: values.state.trim(),
        zipCode: values.zipCode.trim(),
        country: values.country?.trim() || undefined,
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit address" : "New address"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as AddressLabel)}
                    disabled={pending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ADDRESS_LABELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="street1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street 1</FormLabel>
                  <FormControl>
                    <Input disabled={pending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="street2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street 2</FormLabel>
                  <FormControl>
                    <Input disabled={pending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input disabled={pending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input disabled={pending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip code</FormLabel>
                    <FormControl>
                      <Input disabled={pending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input disabled={pending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}
