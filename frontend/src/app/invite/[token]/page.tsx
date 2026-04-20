"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { getInviteByToken, acceptInvite } from "@/app/actions/invites";
import { toast } from "sonner";
import type { OrgRole } from "@/lib/types";

type InviteInfo = {
  id: string;
  email: string;
  role: OrgRole;
  organization: { id: string; name: string };
  expiresAt: string;
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getInviteByToken(token);
        setInvite(res.data);
      } catch {
        setError("This invite link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UserPlus className="size-5" />
            </div>
            <CardTitle>Join {invite.organization.name}</CardTitle>
            <CardDescription>
              You&apos;ve been invited as <strong>{invite.role.toLowerCase()}</strong>.
              Sign in or create an account to accept.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/")}>
              Sign in to accept
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      await acceptInvite(token);
      toast.success(`Joined ${invite!.organization.name}`);
      router.replace("/home");
    } catch {
      toast.error("Failed to accept invite");
      setAccepting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UserPlus className="size-5" />
          </div>
          <CardTitle>Join {invite.organization.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited as <strong>{invite.role.toLowerCase()}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleAccept} disabled={accepting}>
            {accepting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Accept invite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
