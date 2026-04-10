"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

function initialsFor(email: string | null | undefined): string {
  if (!email) return "?";
  const localPart = email.split("@")[0] ?? "";
  const segments = localPart.split(/[._-]/).filter(Boolean);
  const first = segments[0]?.[0] ?? email[0] ?? "?";
  const second = segments[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const email = user?.email ?? "";

  async function onSignOut() {
    try {
      await signOut();
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-out failed.");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="size-8">
          <AvatarFallback>{initialsFor(email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{email || "Signed in"}</div>
          <div className="truncate text-xs text-muted-foreground">Account</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
