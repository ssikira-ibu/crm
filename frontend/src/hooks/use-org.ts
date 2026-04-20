"use client";

import { createContext, useContext } from "react";
import type { OrgRole } from "@/lib/types";

export type OrgInfo = {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
};

export const OrgContext = createContext<OrgInfo | null>(null);

export function useOrg(): OrgInfo {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used inside <OrgContext.Provider>");
  return ctx;
}

export function useHasRole(...roles: OrgRole[]): boolean {
  const { role } = useOrg();
  return roles.includes(role);
}
