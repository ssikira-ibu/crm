"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
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
import { listCustomers } from "@/app/actions/customers";
import type { CustomerWithCounts } from "@/lib/types";

type Props = {
  onCreateCustomer?: () => void;
};

export function CommandPalette({ onCreateCustomer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 200);
  const [results, setResults] = useState<CustomerWithCounts[]>([]);
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
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    listCustomers({ search: debouncedQuery.trim(), limit: 5 })
      .then((res) => {
        if (!cancelled) setResults(res.data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const runCommand = useCallback(
    (fn: () => void) => {
      setOpen(false);
      setQuery("");
      fn();
    },
    [],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title="Command palette"
      description="Search customers, navigate, or run actions."
    >
      <Command shouldFilter={!hasQuery}>
        <CommandInput
          placeholder="Search customers, pages, actions..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {searching ? "Searching..." : "No results found."}
          </CommandEmpty>

          {hasQuery && results.length > 0 && (
            <CommandGroup heading="Customers">
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`customer-${c.id}`}
                  onSelect={() =>
                    runCommand(() => router.push(`/customers/${c.id}`))
                  }
                >
                  <Users className="size-4 text-muted-foreground" />
                  <span>{c.companyName || "Untitled"}</span>
                  {c.industry && (
                    <span className="text-xs text-muted-foreground">
                      {c.industry}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

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
                  <Users className="size-4 text-muted-foreground" />
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
