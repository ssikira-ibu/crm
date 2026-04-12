"use client";

import { useEffect } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/lib/types";

type Props = {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Reminder | null;
  onSaved: () => void;
};

function withTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const next = new Date(date);
  next.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return next;
}

function initialDate(editing: Reminder | null): Date {
  if (editing) return new Date(editing.dueDate);
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

const schema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
  dueDate: z.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time."),
});

type FormValues = z.infer<typeof schema>;

function toValues(editing: Reminder | null): FormValues {
  const d = initialDate(editing);
  return {
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    dueDate: d,
    time: format(d, "HH:mm"),
  };
}

export function ReminderDialog({
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
      const due = withTime(values.dueDate, values.time);
      const input = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        dueDate: due.toISOString(),
      };
      if (editing) {
        await api.reminders.update(customerId, editing.id, input);
        toast.success("Reminder updated.");
      } else {
        await api.reminders.create(customerId, input);
        toast.success("Reminder added.");
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
          <DialogTitle>
            {editing ? "Edit reminder" : "New reminder"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input disabled={pending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} disabled={pending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            disabled={pending}
                          >
                            <CalendarIcon className="size-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(d) => d && field.onChange(d)}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" disabled={pending} {...field} />
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
