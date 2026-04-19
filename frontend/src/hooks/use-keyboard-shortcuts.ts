"use client";

import { useEffect, useRef } from "react";

type Shortcut = {
  key: string;
  handler: () => void;
  when?: boolean;
};

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const chordRef = useRef<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(document.activeElement)) return;

      const key = e.key.toLowerCase();

      if (chordRef.current) {
        const chord = `${chordRef.current} ${key}`;
        chordRef.current = null;
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);

        for (const s of shortcuts) {
          if (s.key.toLowerCase() === chord && (s.when ?? true)) {
            e.preventDefault();
            s.handler();
            return;
          }
        }
        return;
      }

      const hasChordStarting = shortcuts.some(
        (s) => s.key.toLowerCase().startsWith(`${key} `) && (s.when ?? true),
      );

      if (hasChordStarting) {
        chordRef.current = key;
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        chordTimerRef.current = setTimeout(() => {
          chordRef.current = null;
        }, 1000);
        return;
      }

      for (const s of shortcuts) {
        if (s.key.toLowerCase() === key && (s.when ?? true)) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, [shortcuts]);
}
