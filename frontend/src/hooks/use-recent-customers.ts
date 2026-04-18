"use client";

import { useCallback, useSyncExternalStore } from "react";

type RecentCustomer = { id: string; companyName: string };

const STORAGE_KEY = "crm:recent-customers";
const MAX_ITEMS = 5;
const EMPTY: RecentCustomer[] = [];

let listeners: Array<() => void> = [];
let cachedSnapshot: RecentCustomer[] | null = null;

function emit() {
  cachedSnapshot = null;
  listeners.forEach((l) => l());
}

function getSnapshot(): RecentCustomer[] {
  if (cachedSnapshot !== null) return cachedSnapshot;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedSnapshot = raw ? JSON.parse(raw) : EMPTY;
  } catch {
    cachedSnapshot = EMPTY;
  }
  return cachedSnapshot!;
}

function getServerSnapshot(): RecentCustomer[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useRecentCustomers() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const trackCustomer = useCallback((id: string, companyName: string) => {
    const current = getSnapshot();
    const filtered = current.filter((c) => c.id !== id);
    const next = [{ id, companyName }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, []);

  return { recentCustomers: items, trackCustomer };
}
