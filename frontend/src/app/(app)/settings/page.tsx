"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/lib/auth";
import { listMembers, updateMemberRole, removeMember } from "@/app/actions/organizations";
import { createInvite, listInvites, revokeInvite } from "@/app/actions/invites";
import { toast } from "sonner";
import type { OrganizationMember, Invite, OrgRole } from "@/lib/types";

export default function SettingsPage() {
  const { role } = useOrg();
  const { user } = useAuth();

  if (role !== "ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-4">
          <MembersTab currentUserId={user?.uid ?? ""} />
        </TabsContent>
        <TabsContent value="invites" className="mt-4">
          <InvitesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MembersTab({ currentUserId }: { currentUserId: string }) {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMembers().then((res) => {
      setMembers(res.data);
      setLoading(false);
    });
  }, []);

  async function handleRoleChange(memberId: string, role: OrgRole) {
    try {
      const { data } = await updateMemberRole(memberId, role);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? data : m)));
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team members</CardTitle>
        <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {member.displayName ?? member.email}
                  {member.userId === currentUserId && (
                    <Badge variant="secondary" className="ml-2 text-xs">you</Badge>
                  )}
                </p>
                {member.displayName && (
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={member.role}
                  onValueChange={(val) => handleRoleChange(member.id, val as OrgRole)}
                  disabled={member.userId === currentUserId}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="SALESPERSON">Salesperson</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(member.id)}
                  disabled={member.userId === currentUserId}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InvitesTab() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("SALESPERSON");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listInvites().then((res) => {
      setInvites(res.data);
      setLoading(false);
    });
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const { data } = await createInvite({ email: email.trim(), role });
      setInvites((prev) => [data, ...prev]);
      setEmail("");
      toast.success("Invite sent");
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    try {
      await revokeInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast.success("Invite revoked");
    } catch {
      toast.error("Failed to revoke invite");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Invite a team member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Select value={role} onValueChange={(val) => setRole(val as OrgRole)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="SALESPERSON">Salesperson</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              <span className="ml-2">Invite</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
            <CardDescription>{invites.length} pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0 flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium truncate">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.role.toLowerCase()} &middot; expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRevoke(invite.id)}>
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
