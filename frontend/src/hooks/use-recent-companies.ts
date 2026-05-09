"use client";

import { useCallback, useSyncExternalStore } from "react";

type RecentCompany = { id: string; name: string };

const STORAGE_KEY = "crm:recent-companies";
const MAX_ITEMS = 5;
const EMPTY: RecentCompany[] = [];

let listeners: Array<() => void> = [];
let cachedSnapshot: RecentCompany[] | null = null;

function emit() {
  cachedSnapshot = null;
  listeners.forEach((l) => l());
}

function getSnapshot(): RecentCompany[] {
  if (cachedSnapshot !== null) return cachedSnapshot;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedSnapshot = raw ? JSON.parse(raw) : EMPTY;
  } catch {
    cachedSnapshot = EMPTY;
  }
  return cachedSnapshot!;
}

function getServerSnapshot(): RecentCompany[] {
  return EMPTY;
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useRecentCompanies() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const trackCompany = useCallback((id: string, name: string) => {
    const current = getSnapshot();
    const filtered = current.filter((c) => c.id !== id);
    const next = [{ id, name }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emit();
  }, []);

  return { recentCompanies: items, trackCompany };
}
