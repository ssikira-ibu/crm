"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CustomerStatusBadge } from "@/components/customers/status-badge";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import {
  CUSTOMER_STATUSES,
  type Customer,
  type CustomerStatus,
} from "@/lib/types";

type Props = {
  customer: Customer;
  onUpdated: (customer: Customer) => void;
};

const schema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  industry: z.string().trim().optional(),
  website: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\/.+/i.test(v),
      "Enter a valid URL (including http:// or https://).",
    ),
  status: z.enum(CUSTOMER_STATUSES),
});

type FormValues = z.infer<typeof schema>;

function toValues(customer: Customer): FormValues {
  return {
    companyName: customer.companyName ?? "",
    industry: customer.industry ?? "",
    website: customer.website ?? "",
    status: customer.status,
  };
}

export function CustomerHeader({ customer, onUpdated }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(customer),
  });
  const pending = form.formState.isSubmitting;

  useEffect(() => {
    if (editing) form.reset(toValues(customer));
  }, [editing, customer, form]);

  async function onSave(values: FormValues) {
    try {
      const res = await api.customers.update(customer.id, {
        companyName: values.companyName.trim(),
        industry: values.industry?.trim() || undefined,
        website: values.website?.trim() || undefined,
        status: values.status,
      });
      onUpdated(res.data);
      setEditing(false);
      toast.success("Customer updated.");
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function onDelete() {
    await api.customers.remove(customer.id);
    toast.success("Customer deleted.");
    router.push("/customers");
  }

  const displayName = customer.companyName?.trim() || "Untitled customer";

  return (
    <div className="border-b p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/customers">
            <ArrowLeft className="size-4" />
            Customers
          </Link>
        </Button>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <ConfirmDeleteButton
              title="Delete customer?"
              description="This will permanently remove the customer and all related data."
              onConfirm={onDelete}
              trigger={
                <Button variant="outline" size="sm">
                  Delete
                </Button>
              }
            />
          </div>
        )}
      </div>

      {editing ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSave)}
            className="space-y-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input disabled={pending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input disabled={pending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input type="url" disabled={pending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as CustomerStatus)}
                      disabled={pending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOMER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <CustomerStatusBadge status={customer.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customer.industry && <span>{customer.industry}</span>}
            {customer.website && (
              <a
                href={customer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                {customer.website}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
