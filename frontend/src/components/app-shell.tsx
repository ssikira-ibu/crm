"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Loader2, TrendingUp, Users, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
import { CommandPalette } from "./command-palette";
import { CreateCustomerDialog } from "./customers/create-customer-dialog";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/deals", label: "Deals", icon: TrendingUp },
  { href: "/activity", label: "Timeline", icon: Zap },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth("/");
  const pathname = usePathname();
  const router = useRouter();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
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
            <span className="group-data-[collapsible=icon]:hidden">CRM</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ href, label, icon: Icon }) => {
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
    </SidebarProvider>
  );
}
