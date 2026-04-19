"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["Cmd", "K"], label: "Open command palette" },
  { keys: ["G", "H"], label: "Go to Home" },
  { keys: ["G", "C"], label: "Go to Customers" },
  { keys: ["G", "D"], label: "Go to Deals" },
  { keys: ["G", "T"], label: "Go to Timeline" },
  { keys: ["N"], label: "Create new (context-dependent)" },
  { keys: ["?"], label: "Show this help" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KeyboardShortcutHelp({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Navigate and act quickly with your keyboard.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
