"use client";

import { useEffect, useState } from "react";
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
import { createDeal, updateDeal } from "@/app/actions/deals";
import { listPipelines } from "@/app/actions/pipelines";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Deal, PipelineStage } from "@/lib/types";

type Props = {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Deal | null;
  onSaved: () => void;
};

const schema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
  value: z
    .string()
    .min(1, "Value is required.")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Value must be zero or positive."),
  stageId: z.string().min(1, "Stage is required."),
  expectedCloseDate: z.date().optional(),
});

type FormValues = z.infer<typeof schema>;

function toValues(editing: Deal | null, defaultStageId: string): FormValues {
  return {
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    value: String(editing?.value ?? 0),
    stageId: editing?.stageId ?? defaultStageId,
    expectedCloseDate: editing?.expectedCloseDate
      ? new Date(editing.expectedCloseDate)
      : undefined,
  };
}

export function DealDialog({
  companyId,
  open,
  onOpenChange,
  editing,
  onSaved,
}: Props) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  const defaultStageId = stages.length > 0 ? stages[0].id : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(editing, defaultStageId),
  });
  const pending = form.formState.isSubmitting;

  // Load pipeline stages when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoadingStages(true);
      try {
        const res = await listPipelines();
        if (cancelled) return;
        const pipelines = res.data;
        const defaultPipeline = pipelines.find((p: { isDefault: boolean }) => p.isDefault) ?? pipelines[0];
        if (defaultPipeline?.stages) {
          const sorted = [...defaultPipeline.stages].sort((a: PipelineStage, b: PipelineStage) => a.position - b.position);
          setStages(sorted);
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingStages(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset form when stages load or editing changes
  useEffect(() => {
    if (open && stages.length > 0) {
      form.reset(toValues(editing, stages[0].id));
    }
  }, [open, editing, form, stages]);

  async function onSubmit(values: FormValues) {
    try {
      if (editing) {
        await updateDeal(companyId, editing.id, {
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          value: Number(values.value),
          stageId: values.stageId,
          expectedCloseDate: values.expectedCloseDate?.toISOString(),
        });
        toast.success("Deal updated.");
      } else {
        await createDeal(companyId, {
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          value: Number(values.value),
          stageId: values.stageId,
          expectedCloseDate: values.expectedCloseDate?.toISOString(),
        });
        toast.success("Deal created.");
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
          <DialogTitle>{editing ? "Edit deal" : "New deal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3"
            noValidate
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enterprise license renewal"
                      disabled={pending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        disabled={pending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={pending || loadingStages}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingStages ? "Loading..." : "Select stage"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="expectedCloseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected close</FormLabel>
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
                        onSelect={(d) => field.onChange(d ?? undefined)}
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
              <Button type="submit" disabled={pending || loadingStages}>
                {pending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Saving
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
