"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Home, Loader2, Settings, TrendingUp, Users, Zap } from "lucide-react";
import { OrgContext, type OrgInfo } from "@/hooks/use-org";
import type { OrgRole } from "@/lib/types";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutHelp } from "./keyboard-shortcut-help";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useRequireAuth } from "@/lib/auth";
import { useRecentCustomers } from "@/hooks/use-recent-customers";
import { CommandPalette } from "./command-palette";
import { CreateCustomerDialog } from "./customers/create-customer-dialog";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/deals", label: "Deals", icon: TrendingUp },
  { href: "/timeline", label: "Timeline", icon: Zap },
] as const;

export function AppShell({ children, orgInfo }: { children: ReactNode; orgInfo: OrgInfo }) {
  const { user, loading } = useRequireAuth("/");
  const pathname = usePathname();
  const router = useRouter();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const { recentCustomers } = useRecentCustomers();

  const shortcuts = useMemo(
    () => [
      { key: "g h", handler: () => router.push("/home") },
      { key: "g c", handler: () => router.push("/customers") },
      { key: "g d", handler: () => router.push("/deals") },
      { key: "g t", handler: () => router.push("/timeline") },
      { key: "?", handler: () => setShortcutHelpOpen(true) },
      {
        key: "n",
        handler: () => setCreateCustomerOpen(true),
        when: pathname === "/customers",
      },
    ],
    [router, pathname],
  );

  useKeyboardShortcuts(shortcuts);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <OrgContext.Provider value={orgInfo}>
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            href="/home"
            className="flex h-10 items-center gap-2 px-2 font-semibold tracking-tight"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              C
            </div>
            <span className="group-data-[collapsible=icon]:hidden">{orgInfo.organizationName}</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {[...NAV, ...(orgInfo.role === "ADMIN" ? [{ href: "/settings", label: "Settings", icon: Settings } as const] : [])].map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {recentCustomers.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Recent</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {recentCustomers.map((c) => {
                    const active = pathname === `/customers/${c.id}`;
                    return (
                      <SidebarMenuItem key={c.id}>
                        <SidebarMenuButton asChild isActive={active} tooltip={c.companyName}>
                          <Link href={`/customers/${c.id}`}>
                            <Building2 />
                            <span>{c.companyName}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-10 flex h-10 items-center px-3 md:hidden">
          <SidebarTrigger />
        </div>
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
      <CommandPalette onCreateCustomer={() => setCreateCustomerOpen(true)} />
      <CreateCustomerDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        onCreated={(c) => {
          setCreateCustomerOpen(false);
          router.push(`/customers/${c.id}`);
        }}
      />
      <KeyboardShortcutHelp open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </SidebarProvider>
    </OrgContext.Provider>
  );
}
