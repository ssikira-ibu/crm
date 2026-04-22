"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  Clock,
  Home,
  Plus,
  Search,
  StickyNote,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRecentCustomers } from "@/hooks/use-recent-customers";
import { searchAll } from "@/app/actions/search";
import type { SearchResultItem } from "@/lib/types";

const ICON_MAP = {
  customer: Users,
  contact: Users,
  deal: TrendingUp,
  note: StickyNote,
  activity: BookOpen,
  reminder: CalendarCheck,
} as const;

const LABEL_MAP = {
  customer: "Customer",
  contact: "Contact",
  deal: "Deal",
  note: "Note",
  activity: "Activity",
  reminder: "Reminder",
} as const;

function resultUrl(item: SearchResultItem): string {
  switch (item.type) {
    case "customer":
      return `/customers/${item.id}`;
    case "contact":
    case "deal":
    case "note":
    case "activity":
    case "reminder":
      return `/customers/${item.customerId}`;
  }
}

type Props = {
  onCreateCustomer?: () => void;
};

export function CommandPalette({ onCreateCustomer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const { recentCustomers } = useRecentCustomers();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    let cancelled = false;
    const run = async () => {
      if (!trimmed) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await searchAll(trimmed, 10);
        if (!cancelled) setResults(res.data.results);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const runCommand = useCallback((fn: () => void) => {
    setOpen(false);
    setQuery("");
    fn();
  }, []);

  const hasQuery = query.trim().length > 0;

  const grouped = new Map<string, SearchResultItem[]>();
  for (const item of results) {
    const key = item.type;
    const list = grouped.get(key);
    if (list) list.push(item);
    else grouped.set(key, [item]);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title="Command palette"
      description="Search across customers, contacts, deals, notes, and more."
    >
      <Command shouldFilter={!hasQuery}>
        <CommandInput
          placeholder="Search everything..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {searching ? "Searching..." : "No results found."}
          </CommandEmpty>

          {hasQuery &&
            Array.from(grouped.entries()).map(([type, items]) => {
              const label = LABEL_MAP[type as keyof typeof LABEL_MAP] ?? type;
              return (
                <CommandGroup key={type} heading={`${label}s`}>
                  {items.map((item) => {
                    const Icon = ICON_MAP[item.type] ?? Search;
                    return (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        value={`${item.type}-${item.id}`}
                        onSelect={() =>
                          runCommand(() => router.push(resultUrl(item)))
                        }
                      >
                        <Icon className="size-4 text-muted-foreground" />
                        <span>{item.title}</span>
                        {item.subtitle && (
                          <span className="text-xs text-muted-foreground truncate">
                            {item.subtitle}
                          </span>
                        )}
                        {item.type !== "customer" && item.customerName && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {item.customerName}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}

          {!hasQuery && recentCustomers.length > 0 && (
            <CommandGroup heading="Recent">
              {recentCustomers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`recent-${c.companyName}`}
                  onSelect={() =>
                    runCommand(() => router.push(`/customers/${c.id}`))
                  }
                >
                  <Clock className="size-4 text-muted-foreground" />
                  <span>{c.companyName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!hasQuery && (
            <>
              <CommandGroup heading="Navigation">
                <CommandItem
                  value="go-home"
                  onSelect={() => runCommand(() => router.push("/home"))}
                >
                  <Home className="size-4 text-muted-foreground" />
                  <span>Home</span>
                  <CommandShortcut>G H</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="go-customers"
                  onSelect={() => runCommand(() => router.push("/customers"))}
                >
                  <Users className="size-4 text-muted-foreground" />
                  <span>Customers</span>
                  <CommandShortcut>G C</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="go-deals"
                  onSelect={() => runCommand(() => router.push("/deals"))}
                >
                  <TrendingUp className="size-4 text-muted-foreground" />
                  <span>Deals</span>
                  <CommandShortcut>G D</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="go-timeline"
                  onSelect={() => runCommand(() => router.push("/timeline"))}
                >
                  <Zap className="size-4 text-muted-foreground" />
                  <span>Timeline</span>
                  <CommandShortcut>G T</CommandShortcut>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Actions">
                {onCreateCustomer && (
                  <CommandItem
                    value="create-customer"
                    onSelect={() => runCommand(onCreateCustomer)}
                  >
                    <Plus className="size-4 text-muted-foreground" />
                    <span>Create customer</span>
                    <CommandShortcut>N</CommandShortcut>
                  </CommandItem>
                )}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
