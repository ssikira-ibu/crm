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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createActivity, updateActivity } from "@/app/actions/activities";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { ACTIVITY_TYPES, type Activity, type ActivityType } from "@/lib/types";

const TYPE_LABEL: Record<ActivityType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  OTHER: "Other",
};

type Props = {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Activity | null;
  onSaved: () => void;
};

const schema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
  date: z.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid time."),
});

type FormValues = z.infer<typeof schema>;

function withTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const next = new Date(date);
  next.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return next;
}

function toValues(editing: Activity | null): FormValues {
  const d = editing ? new Date(editing.date) : new Date();
  return {
    type: editing?.type ?? "CALL",
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    date: d,
    time: format(d, "HH:mm"),
  };
}

export function ActivityDialog({
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
      const dateTime = withTime(values.date, values.time);
      const input = {
        type: values.type,
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        date: dateTime.toISOString(),
      };
      if (editing) {
        await updateActivity(customerId, editing.id, input);
        toast.success("Activity updated.");
      } else {
        await createActivity(customerId, input);
        toast.success("Activity logged.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit activity" : "Log activity"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3"
            noValidate
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as ActivityType)}
                      disabled={pending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TYPE_LABEL[t]}
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Quarterly review call"
                        disabled={pending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
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
                            <CalendarIcon className="size-3.5" />
                            {field.value
                              ? format(field.value, "PPP")
                              : "Pick a date"}
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Optional details..."
                      disabled={pending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Saving
                  </>
                ) : editing ? (
                  "Save"
                ) : (
                  "Log"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
