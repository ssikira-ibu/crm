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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { describeError } from "@/lib/errors";
import type { Note } from "@/lib/types";

type Props = {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Note | null;
  onSaved: () => void;
};

const schema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  body: z.string().trim().min(1, "Body is required."),
});

type FormValues = z.infer<typeof schema>;

function toValues(editing: Note | null): FormValues {
  return { title: editing?.title ?? "", body: editing?.body ?? "" };
}

export function NoteDialog({
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
      const input = { title: values.title.trim(), body: values.body.trim() };
      if (editing) {
        await api.notes.update(customerId, editing.id, input);
        toast.success("Note updated.");
      } else {
        await api.notes.create(customerId, input);
        toast.success("Note added.");
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
          <DialogTitle>{editing ? "Edit note" : "New note"}</DialogTitle>
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
                    <Input placeholder="Meeting notes, call summary..." disabled={pending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Write your note here..."
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
