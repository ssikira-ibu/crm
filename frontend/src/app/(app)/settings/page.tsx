"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  createInvite,
  listInvites,
  revokeInvite,
} from "@/app/actions/invites";
import { listMembers, removeMember, updateMemberRole } from "@/app/actions/organizations";
import {
  createPipeline,
  createPipelineStage,
  deletePipelineStage,
  listPipelines,
  updatePipeline,
  updatePipelineStage,
} from "@/app/actions/pipelines";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { describeError } from "@/lib/errors";
import { useAuth } from "@/lib/auth";
import { useOrg } from "@/hooks/use-org";
import type {
  Invite,
  OrganizationMember,
  OrgRole,
  Pipeline,
  PipelineStage,
  PipelineStageCreate,
} from "@/lib/types";

type PipelineWithStages = Pipeline & { stages?: PipelineStage[] };
type StageKind = "open" | "won" | "lost";

const starterStages: PipelineStageCreate[] = [
  { name: "Lead In", position: 0, probability: 10 },
  { name: "Qualified", position: 1, probability: 25 },
  { name: "Proposal", position: 2, probability: 50 },
  { name: "Negotiation", position: 3, probability: 75 },
  { name: "Won", position: 4, probability: 100, isWon: true },
  { name: "Lost", position: 5, probability: 0, isLost: true },
];

function sortedStages(pipeline?: PipelineWithStages | null) {
  return [...(pipeline?.stages ?? [])].sort((a, b) => a.position - b.position);
}

function stageKind(stage: Pick<PipelineStage, "isWon" | "isLost">): StageKind {
  if (stage.isWon) return "won";
  if (stage.isLost) return "lost";
  return "open";
}

function kindFlags(kind: StageKind) {
  return {
    isWon: kind === "won",
    isLost: kind === "lost",
  };
}

function stageBadge(stage: PipelineStage) {
  if (stage.isWon) return <Badge variant="secondary">Won</Badge>;
  if (stage.isLost) return <Badge variant="outline">Lost</Badge>;
  return <Badge variant="outline">Open</Badge>;
}

function replacePipeline(
  pipelines: PipelineWithStages[],
  pipeline: PipelineWithStages,
) {
  return pipelines.map((item) => (item.id === pipeline.id ? pipeline : item));
}

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
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Tabs defaultValue="pipelines">
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
        </TabsList>
        <TabsContent value="pipelines" className="mt-4">
          <PipelinesTab />
        </TabsContent>
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

function PipelinesTab() {
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingStarter, setCreatingStarter] = useState(false);
  const [savingPipeline, setSavingPipeline] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [creatingStage, setCreatingStage] = useState(false);
  const [archiveStage, setArchiveStage] = useState<PipelineStage | null>(null);
  const [busyStageId, setBusyStageId] = useState<string | null>(null);

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === selectedId) ?? pipelines[0] ?? null,
    [pipelines, selectedId],
  );
  const stages = useMemo(() => sortedStages(selectedPipeline), [selectedPipeline]);
  const [pipelineName, setPipelineName] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPipelines()
      .then((res) => {
        if (cancelled) return;
        const items = res.data as PipelineWithStages[];
        const nextSelected = items.find((pipeline) => pipeline.isDefault) ?? items[0] ?? null;
        setPipelines(items);
        setSelectedId(nextSelected?.id ?? "");
        setPipelineName(nextSelected?.name ?? "");
      })
      .catch((err) => toast.error(describeError(err, "Failed to load pipelines.")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshPipeline(id: string) {
    const res = await listPipelines();
    const items = res.data as PipelineWithStages[];
    const nextSelected = items.find((pipeline) => pipeline.id === id) ?? null;
    setPipelines(items);
    setSelectedId(id);
    setPipelineName(nextSelected?.name ?? "");
    return nextSelected;
  }

  async function handleCreateStarterPipeline() {
    setCreatingStarter(true);
    try {
      const { data: pipeline } = await createPipeline({
        name: "Sales Pipeline",
        isDefault: true,
        position: pipelines.length,
      });
      for (const stage of starterStages) {
        await createPipelineStage(pipeline.id, stage);
      }
      await refreshPipeline(pipeline.id);
      toast.success("Starter pipeline created");
    } catch (err) {
      toast.error(describeError(err, "Failed to create starter pipeline."));
    } finally {
      setCreatingStarter(false);
    }
  }

  async function handleSavePipeline() {
    if (!selectedPipeline || !pipelineName.trim()) return;
    setSavingPipeline(true);
    try {
      const { data } = await updatePipeline(selectedPipeline.id, {
        name: pipelineName.trim(),
      });
      setPipelines((prev) => replacePipeline(prev, data as PipelineWithStages));
      toast.success("Pipeline saved");
    } catch (err) {
      toast.error(describeError(err, "Failed to save pipeline."));
    } finally {
      setSavingPipeline(false);
    }
  }

  async function handleMakeDefault() {
    if (!selectedPipeline || selectedPipeline.isDefault) return;
    setSavingPipeline(true);
    try {
      const { data } = await updatePipeline(selectedPipeline.id, { isDefault: true });
      setPipelines((prev) =>
        prev.map((pipeline) => ({
          ...pipeline,
          isDefault: pipeline.id === data.id,
        })),
      );
      toast.success("Default pipeline updated");
    } catch (err) {
      toast.error(describeError(err, "Failed to update default pipeline."));
    } finally {
      setSavingPipeline(false);
    }
  }

  async function handleMoveStage(stage: PipelineStage, direction: -1 | 1) {
    if (!selectedPipeline) return;
    const currentIndex = stages.findIndex((item) => item.id === stage.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= stages.length) return;

    const reordered = [...stages];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);
    setBusyStageId(stage.id);

    try {
      await Promise.all(
        reordered.map((item, index) =>
          updatePipelineStage(selectedPipeline.id, item.id, { position: index }),
        ),
      );
      setPipelines((prev) =>
        prev.map((pipeline) =>
          pipeline.id === selectedPipeline.id
            ? { ...pipeline, stages: reordered.map((item, index) => ({ ...item, position: index })) }
            : pipeline,
        ),
      );
      toast.success("Stage order updated");
    } catch (err) {
      toast.error(describeError(err, "Failed to reorder stages."));
    } finally {
      setBusyStageId(null);
    }
  }

  async function handleArchiveStage() {
    if (!selectedPipeline || !archiveStage) return;
    setBusyStageId(archiveStage.id);
    try {
      await deletePipelineStage(selectedPipeline.id, archiveStage.id);
      setPipelines((prev) =>
        prev.map((pipeline) =>
          pipeline.id === selectedPipeline.id
            ? {
                ...pipeline,
                stages: pipeline.stages?.filter((stage) => stage.id !== archiveStage.id),
              }
            : pipeline,
        ),
      );
      toast.success("Stage archived");
      setArchiveStage(null);
    } catch (err) {
      toast.error(describeError(err, "Move deals out of this stage before archiving it."));
    } finally {
      setBusyStageId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales pipeline</CardTitle>
          <CardDescription>Create the default stages your team will use for new deals.</CardDescription>
          <CardAction>
            <Button onClick={handleCreateStarterPipeline} disabled={creatingStarter}>
              {creatingStarter ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Plus data-icon="inline-start" />
              )}
              Create starter pipeline
            </Button>
          </CardAction>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Pipelines</CardTitle>
          <CardDescription>{pipelines.length} configured</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {pipelines.map((pipeline) => (
            <Button
              key={pipeline.id}
              type="button"
              variant={pipeline.id === selectedPipeline?.id ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => {
                setSelectedId(pipeline.id);
                setPipelineName(pipeline.name);
              }}
            >
              <span className="truncate">{pipeline.name}</span>
              {pipeline.isDefault && <CheckCircle2 data-icon="inline-end" />}
            </Button>
          ))}
          <Separator className="my-1" />
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateStarterPipeline}
            disabled={creatingStarter}
          >
            {creatingStarter ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            New starter pipeline
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selectedPipeline?.name ?? "Pipeline"}</CardTitle>
          <CardDescription>
            {stages.length} stage{stages.length === 1 ? "" : "s"}
            {selectedPipeline?.isDefault ? " · default for new deals" : ""}
          </CardDescription>
          <CardAction>
            <Button type="button" onClick={() => setCreatingStage(true)}>
              <Plus data-icon="inline-start" />
              Add stage
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pipeline-name">Pipeline name</Label>
              <Input
                id="pipeline-name"
                value={pipelineName}
                onChange={(event) => setPipelineName(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleMakeDefault}
                disabled={!selectedPipeline || selectedPipeline.isDefault || savingPipeline}
              >
                Make default
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleSavePipeline}
                disabled={!pipelineName.trim() || savingPipeline}
              >
                {savingPipeline ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                Save
              </Button>
            </div>
          </div>

          {stages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((stage, index) => (
                  <TableRow key={stage.id}>
                    <TableCell>
                      <div className="flex min-w-40 flex-col gap-1">
                        <span className="font-medium">{stage.name}</span>
                        <span className="text-xs text-muted-foreground">Position {index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell>{stage.probability}%</TableCell>
                    <TableCell>{stageBadge(stage)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Move ${stage.name} up`}
                          disabled={index === 0 || busyStageId !== null}
                          onClick={() => handleMoveStage(stage, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Move ${stage.name} down`}
                          disabled={index === stages.length - 1 || busyStageId !== null}
                          onClick={() => handleMoveStage(stage, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${stage.name}`}
                          onClick={() => setEditingStage(stage)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Archive ${stage.name}`}
                          disabled={busyStageId !== null}
                          onClick={() => setArchiveStage(stage)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              This pipeline has no active stages.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPipeline && (
        <StageDialog
          key={editingStage?.id ?? (creatingStage ? "new" : "closed")}
          pipelineId={selectedPipeline.id}
          stage={editingStage}
          creating={creatingStage}
          nextPosition={stages.length}
          onClose={() => {
            setEditingStage(null);
            setCreatingStage(false);
          }}
          onSaved={(stage) => {
            setPipelines((prev) =>
              prev.map((pipeline) => {
                if (pipeline.id !== selectedPipeline.id) return pipeline;
                const existing = pipeline.stages?.some((item) => item.id === stage.id);
                const updatedStages = existing
                  ? pipeline.stages?.map((item) => (item.id === stage.id ? stage : item))
                  : [...(pipeline.stages ?? []), stage];
                return { ...pipeline, stages: updatedStages };
              }),
            );
          }}
        />
      )}

      <AlertDialog open={!!archiveStage} onOpenChange={(open) => !open && setArchiveStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive stage?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveStage
                ? `${archiveStage.name} will be removed from active pipeline views. Stages with active deals must be cleared first.`
                : "This stage will be archived."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyStageId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busyStageId !== null}
              onClick={(event) => {
                event.preventDefault();
                handleArchiveStage();
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StageDialog({
  pipelineId,
  stage,
  creating,
  nextPosition,
  onClose,
  onSaved,
}: {
  pipelineId: string;
  stage: PipelineStage | null;
  creating: boolean;
  nextPosition: number;
  onClose: () => void;
  onSaved: (stage: PipelineStage) => void;
}) {
  const open = creating || !!stage;
  const [name, setName] = useState(stage?.name ?? "");
  const [probability, setProbability] = useState(String(stage?.probability ?? 0));
  const [kind, setKind] = useState<StageKind>(stage ? stageKind(stage) : "open");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    const nextProbability = Math.max(0, Math.min(100, Number(probability) || 0));
    const payload = {
      name: name.trim(),
      probability: nextProbability,
      ...kindFlags(kind),
    };

    setSaving(true);
    try {
      const { data } = stage
        ? await updatePipelineStage(pipelineId, stage.id, payload)
        : await createPipelineStage(pipelineId, {
            ...payload,
            position: nextPosition,
          });
      onSaved(data);
      toast.success(stage ? "Stage updated" : "Stage created");
      onClose();
    } catch (err) {
      toast.error(describeError(err, "Failed to save stage."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{stage ? "Edit stage" : "Add stage"}</AlertDialogTitle>
            <AlertDialogDescription>
              Stage probability affects weighted forecast and won/lost stages close deals.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stage-name">Name</Label>
              <Input
                id="stage-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="stage-probability">Probability</Label>
                <Input
                  id="stage-probability"
                  type="number"
                  min={0}
                  max={100}
                  value={probability}
                  onChange={(event) => setProbability(event.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="stage-kind">Status</Label>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as StageKind)}
                  disabled={saving}
                >
                  <SelectTrigger id="stage-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={saving}>Cancel</AlertDialogCancel>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
            >
              {saving ? "Saving..." : "Save stage"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
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
      setMembers((prev) => prev.map((member) => (member.id === memberId ? data : member)));
      toast.success("Role updated");
    } catch (err) {
      toast.error(describeError(err, "Failed to update role."));
    }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember(memberId);
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      toast.success("Member removed");
    } catch (err) {
      toast.error(describeError(err, "Failed to remove member."));
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
            <div key={member.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.user?.displayName ?? member.user?.email ?? "Unknown"}
                  {member.userId === currentUserId && (
                    <Badge variant="secondary" className="ml-2 text-xs">you</Badge>
                  )}
                </p>
                {member.user?.displayName && member.user?.email && (
                  <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={member.role}
                  onValueChange={(value) => handleRoleChange(member.id, value as OrgRole)}
                  disabled={member.userId === currentUserId}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="SALESPERSON">Salesperson</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(member.id)}
                  disabled={member.userId === currentUserId}
                  aria-label="Remove member"
                >
                  <Trash2 />
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

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const { data } = await createInvite({ email: email.trim(), role });
      setInvites((prev) => [data, ...prev]);
      setEmail("");
      toast.success("Invite sent");
    } catch (err) {
      toast.error(describeError(err, "Failed to send invite."));
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    try {
      await revokeInvite(inviteId);
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
      toast.success("Invite revoked");
    } catch (err) {
      toast.error(describeError(err, "Failed to revoke invite."));
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <Select value={role} onValueChange={(value) => setRole(value as OrgRole)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="SALESPERSON">Salesperson</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <UserPlus data-icon="inline-start" />
              )}
              Invite
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
                <div key={invite.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="truncate text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.role.toLowerCase()} · expires {new Date(invite.expiresAt).toLocaleDateString()}
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
