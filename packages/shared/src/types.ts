import type {
  CompanyStatus,
  AddressLabel,
  PhoneLabel,
  ActivityType,
  TaskStatus,
  TaskPriority,
  CustomFieldType,
  CustomFieldEntity,
  OrgRole,
  InviteStatus,
} from "./enums.js";

// ---------------------------------------------------------------------------
// Auth & Org
// ---------------------------------------------------------------------------

export type User = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Organization = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
  updatedAt: string;
  user?: User;
};

export type Invite = {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  status: InviteStatus;
  invitedBy: string;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export type OrgContext = {
  organizationId: string;
  userId: string;
  role: OrgRole;
  actor: RequestActor;
};

export type RequestActor =
  | { type: "user" }
  | { type: "agent"; conversationId: string; toolCallId?: string };

export type MeResponse = {
  uid: string;
  email: string;
  displayName: string | null;
  organization: (Organization & { role: OrgRole; memberCount: number }) | null;
};

// ---------------------------------------------------------------------------
// CRM Core
// ---------------------------------------------------------------------------

export type Company = {
  id: string;
  organizationId: string;
  ownerId: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  companyId: string;
  ownerId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Address = {
  id: string;
  companyId: string;
  label: AddressLabel;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
};

export type PhoneNumber = {
  id: string;
  contactId: string;
  label: PhoneLabel;
  number: string;
  extension: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Pipeline & Deals
// ---------------------------------------------------------------------------

export type Pipeline = {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  stages?: PipelineStage[];
};

export type PipelineStage = {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Deal = {
  id: string;
  organizationId: string;
  companyId: string;
  contactId: string | null;
  ownerId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  description: string | null;
  value: number;
  expectedCloseDate: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stage?: PipelineStage;
  company?: { id: string; name: string | null; status: CompanyStatus };
};

// ---------------------------------------------------------------------------
// Activities, Notes, Tasks
// ---------------------------------------------------------------------------

export type Activity = {
  id: string;
  companyId: string;
  contactId: string | null;
  dealId: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  companyId: string;
  contactId: string | null;
  dealId: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  organizationId: string;
  companyId: string | null;
  contactId: string | null;
  dealId: string | null;
  assigneeId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export type Tag = {
  id: string;
  organizationId: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Event Log
// ---------------------------------------------------------------------------

export type Event = {
  id: string;
  sequence: number;
  organizationId: string;
  actorId: string | null;
  companyId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  source: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type EventWithCompany = Event & {
  company: { id: string; name: string | null; status: CompanyStatus } | null;
};

// ---------------------------------------------------------------------------
// Custom Fields
// ---------------------------------------------------------------------------

export type CustomFieldDefinition = {
  id: string;
  organizationId: string;
  entityType: CustomFieldEntity;
  name: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options: string[] | null;
  isRequired: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomFieldValue = {
  id: string;
  definitionId: string;
  entityId: string;
  value: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Composite / View Types
// ---------------------------------------------------------------------------

export type CompanyWithCounts = Company & {
  _count: {
    contacts: number;
    tasks: number;
    notes: number;
    deals: number;
    activities: number;
  };
};

export type CompanyWithRelations = Company & {
  contacts: (Contact & { phoneNumbers: PhoneNumber[] })[];
  addresses: Address[];
  deals: (Deal & { stage: PipelineStage })[];
  activities: Activity[];
  notes: Note[];
  tasks: Task[];
  tags: Tag[];
};

export type TaskWithCompany = Task & {
  company: { id: string; name: string | null; status: CompanyStatus } | null;
};

export type NoteWithCompany = Note & {
  company: { id: string; name: string | null };
};

export type DealWithCompany = Deal & {
  stage: PipelineStage;
  company: { id: string; name: string | null; status: CompanyStatus };
  owner?: { id: string; displayName: string | null; email: string };
};

export type DealDetail = Deal & {
  stage: PipelineStage;
  pipeline: Pipeline & { stages: PipelineStage[] };
  company: { id: string; name: string | null; status: CompanyStatus };
  contact: { id: string; firstName: string; lastName: string; email: string | null; jobTitle: string | null } | null;
  owner: { id: string; displayName: string | null; email: string };
  activities: Activity[];
  notes: Note[];
  tasks: Task[];
};

export type DealsOverviewMetrics = {
  pipelineValue: number;
  weightedForecast: number;
  wonThisMonth: number;
  wonLastMonth: number;
  winRate: number;
  totalDeals: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
};

export type DealsOverviewStageSummary = {
  id: string;
  name: string;
  position: number;
  probability: number;
  value: number;
  count: number;
};

export type DealsOverview = {
  deals: DealWithCompany[];
  metrics: DealsOverviewMetrics;
  stageSummary: DealsOverviewStageSummary[];
};

export type ActivityWithCompany = Activity & {
  company: { id: string; name: string | null };
};

export type DashboardData = {
  tasks: TaskWithCompany[];
  recentNotes: NoteWithCompany[];
  recentActivities: ActivityWithCompany[];
  deals: DealWithCompany[];
  stats: {
    total: number;
    byStatus: Partial<Record<CompanyStatus, number>>;
    openDealsValue: number;
    openDealsCount: number;
  };
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Single<T> = { data: T };
export type Paginated<T> = { data: T[]; meta: PageMeta };

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export type AgentToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: AgentToolCall[];
  createdAt: string;
};

export type AgentThinkingBlock = { thinking: string; signature: string };
export type AgentRedactedThinkingBlock = { data: string };

export type AgentProviderMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      toolCalls?: AgentToolCall[];
      /**
       * Thinking blocks from this turn. Anthropic requires these to be sent
       * back unchanged on subsequent turns whenever tool use is involved
       * (the signature is verified server-side).
       */
      thinkingBlocks?: AgentThinkingBlock[];
      redactedThinkingBlocks?: AgentRedactedThinkingBlock[];
    }
  | {
      role: "tool";
      toolUseId: string;
      content: string;
      isError: boolean;
    };

export type AgentActionStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED" | "EXPIRED";

export type AgentActionRisk = "write" | "destructive" | "external";

export type AgentPendingAction = {
  id: string;
  conversationId: string;
  toolCallId: string;
  toolName: string;
  risk: AgentActionRisk;
  summary: string;
  input: Record<string, unknown>;
  status: AgentActionStatus;
  createdAt: string;
  expiresAt: string;
};

export type AgentConversation = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentConversationDetail = AgentConversation & {
  messages: AgentMessage[];
  providerMessages: AgentProviderMessage[];
  pendingActions: AgentPendingAction[];
};

export type AgentSSEEvent =
  | { type: "text_delta"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "tool_start"; tool: string; description: string }
  | { type: "tool_end"; tool: string }
  | { type: "confirmation_required"; action: AgentPendingAction }
  | { type: "error"; message: string }
  | {
      type: "done";
      conversationId: string;
      /** True if the loop paused awaiting user confirmation on a gated tool. */
      paused?: boolean;
      messages?: AgentMessage[];
      providerMessages?: AgentProviderMessage[];
      tokenUsage?: { input: number; output: number };
    };

export type SearchResultItem = {
  id: string;
  type: "company" | "contact" | "deal" | "note" | "activity" | "task";
  title: string;
  subtitle: string | null;
  companyId: string;
  companyName: string | null;
  similarity: number;
};

export type SearchResults = {
  query: string;
  results: SearchResultItem[];
};
