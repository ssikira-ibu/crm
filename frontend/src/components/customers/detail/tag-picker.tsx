"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  listTags,
  createTag,
  addTagToCustomer,
  removeTagFromCustomer,
} from "@/app/actions/tags";
import { describeError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

type Props = {
  customerId: string;
  assigned: Tag[];
  onChanged: () => void;
};

function TagDot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block size-2 rounded-full shrink-0"
      style={{ backgroundColor: color ?? "#a1a1aa" }}
    />
  );
}

export function TagPicker({ customerId, assigned, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    listTags()
      .then((res) => setAllTags(res.data))
      .catch(() => {});
  }, [open]);

  const assignedIds = new Set(assigned.map((t) => t.id));

  async function toggle(tag: Tag) {
    try {
      if (assignedIds.has(tag.id)) {
        await removeTagFromCustomer(customerId, tag.id);
      } else {
        await addTagToCustomer(customerId, tag.id);
      }
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function handleCreate() {
    const name = search.trim();
    if (!name) return;
    try {
      const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
      const res = await createTag({ name, color });
      await addTagToCustomer(customerId, res.data.id);
      setSearch("");
      onChanged();
      listTags()
        .then((r) => setAllTags(r.data))
        .catch(() => {});
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  async function handleRemove(tag: Tag) {
    try {
      await removeTagFromCustomer(customerId, tag.id);
      onChanged();
    } catch (err) {
      toast.error(describeError(err));
    }
  }

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assigned.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="gap-1.5 pr-1 text-xs font-normal"
        >
          <TagDot color={tag.color} />
          {tag.name}
          <button
            type="button"
            className="ml-0.5 rounded-sm p-0.5 hover:bg-accent transition-colors"
            onClick={() => handleRemove(tag)}
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-5 rounded-full"
          >
            <Plus className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty className="py-2 px-3">
                {search.trim() ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                    onClick={handleCreate}
                  >
                    <Plus className="size-3.5" />
                    Create &ldquo;{search.trim()}&rdquo;
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags found.</p>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((tag) => {
                  const isAssigned = assignedIds.has(tag.id);
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() =>
                        startTransition(() => {
                          toggle(tag);
                        })
                      }
                    >
                      <TagDot color={tag.color} />
                      <span className="flex-1 truncate">{tag.name}</span>
                      {isAssigned && (
                        <Check className="size-3.5 text-muted-foreground" />
                      )}
                    </CommandItem>
                  );
                })}
                {search.trim() && !exactMatch && filtered.length > 0 && (
                  <CommandItem
                    value={`__create__${search}`}
                    onSelect={handleCreate}
                  >
                    <Plus className="size-3.5" />
                    Create &ldquo;{search.trim()}&rdquo;
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
