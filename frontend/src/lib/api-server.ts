import "server-only";
import { SignJWT } from "jose";
import { getSession } from "./session";
import { serverEnv } from "./env";
import type {
  Address,
  AddressCreate,
  AddressUpdate,
  Activity,
  ActivityCreate,
  ActivityListParams,
  ActivityUpdate,
  Contact,
  ContactCreate,
  ContactUpdate,
  Company,
  CompanyWithCounts,
  DashboardData,
  CompanyCreate,
  CompanyListParams,
  CompanyUpdate,
  CompanyWithRelations,
  Deal,
  DealCreate,
  DealDetail,
  DealListParams,
  DealUpdate,
  DealsOverview,
  Note,
  NoteCreate,
  NoteUpdate,
  Paginated,
  PhoneNumber,
  PhoneNumberCreate,
  PhoneNumberUpdate,
  Task,
  TaskCreate,
  TaskListParams,
  TaskUpdate,
  TaskWithCompany,
  Single,
  Tag,
  TagCreate,
  TagUpdate,
  EventWithCompany,
  SearchResults,
  MeResponse,
  Organization,
  OrganizationMember,
  OrgRole,
  OrganizationCreate,
  InviteCreate,
  Invite,
  Pipeline,
  PipelineCreate,
  PipelineStage,
  PipelineStageCreate,
  PipelineStageUpdate,
  PipelineUpdate,
} from "./types";

const API_URL =
  (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000";

const encodedKey = new TextEncoder().encode(serverEnv.S2S_JWT_SECRET);

export async function createS2SToken(uid: string, email: string): Promise<string> {
  return new SignJWT({ uid, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(encodedKey);
}

export class ServerApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ServerApiError";
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params?: Query): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
};

async function serverRequest<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", query, body } = opts;

  const session = await getSession();
  if (!session) {
    throw new ServerApiError(401, "UNAUTHORIZED", "No active session");
  }

  const token = await createS2SToken(session.uid, session.email);

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}/api${path}${buildQuery(query)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = json as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new ServerApiError(
      res.status,
      err?.error?.code ?? "UNKNOWN",
      err?.error?.message ?? res.statusText ?? "Request failed",
      err?.error?.details,
    );
  }
  return json as T;
}

const dashboard = {
  get: () => serverRequest<Single<DashboardData>>("/dashboard"),
};

const companies = {
  list: (params?: CompanyListParams) =>
    serverRequest<Paginated<CompanyWithCounts>>("/companies", { query: params }),
  get: (id: string) =>
    serverRequest<Single<CompanyWithRelations>>(`/companies/${id}`),
  create: (input: CompanyCreate) =>
    serverRequest<Single<Company>>("/companies", { method: "POST", body: input }),
  update: (id: string, input: CompanyUpdate) =>
    serverRequest<Single<Company>>(`/companies/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) =>
    serverRequest<void>(`/companies/${id}`, { method: "DELETE" }),
};

const contacts = {
  list: (companyId: string) =>
    serverRequest<Paginated<Contact>>(`/companies/${companyId}/contacts`),
  get: (companyId: string, contactId: string) =>
    serverRequest<Single<Contact>>(`/companies/${companyId}/contacts/${contactId}`),
  create: (companyId: string, input: ContactCreate) =>
    serverRequest<Single<Contact>>(`/companies/${companyId}/contacts`, { method: "POST", body: input }),
  update: (companyId: string, contactId: string, input: ContactUpdate) =>
    serverRequest<Single<Contact>>(`/companies/${companyId}/contacts/${contactId}`, { method: "PATCH", body: input }),
  remove: (companyId: string, contactId: string) =>
    serverRequest<void>(`/companies/${companyId}/contacts/${contactId}`, { method: "DELETE" }),
};

const addresses = {
  list: (companyId: string) =>
    serverRequest<Paginated<Address>>(`/companies/${companyId}/addresses`),
  get: (companyId: string, addressId: string) =>
    serverRequest<Single<Address>>(`/companies/${companyId}/addresses/${addressId}`),
  create: (companyId: string, input: AddressCreate) =>
    serverRequest<Single<Address>>(`/companies/${companyId}/addresses`, { method: "POST", body: input }),
  update: (companyId: string, addressId: string, input: AddressUpdate) =>
    serverRequest<Single<Address>>(`/companies/${companyId}/addresses/${addressId}`, { method: "PATCH", body: input }),
  remove: (companyId: string, addressId: string) =>
    serverRequest<void>(`/companies/${companyId}/addresses/${addressId}`, { method: "DELETE" }),
};

const phoneNumbers = {
  list: (companyId: string, contactId: string) =>
    serverRequest<Paginated<PhoneNumber>>(`/companies/${companyId}/contacts/${contactId}/phone-numbers`),
  get: (companyId: string, contactId: string, phoneNumberId: string) =>
    serverRequest<Single<PhoneNumber>>(`/companies/${companyId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`),
  create: (companyId: string, contactId: string, input: PhoneNumberCreate) =>
    serverRequest<Single<PhoneNumber>>(`/companies/${companyId}/contacts/${contactId}/phone-numbers`, { method: "POST", body: input }),
  update: (companyId: string, contactId: string, phoneNumberId: string, input: PhoneNumberUpdate) =>
    serverRequest<Single<PhoneNumber>>(`/companies/${companyId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`, { method: "PATCH", body: input }),
  remove: (companyId: string, contactId: string, phoneNumberId: string) =>
    serverRequest<void>(`/companies/${companyId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`, { method: "DELETE" }),
};

const notes = {
  list: (companyId: string) =>
    serverRequest<Paginated<Note>>(`/companies/${companyId}/notes`),
  get: (companyId: string, noteId: string) =>
    serverRequest<Single<Note>>(`/companies/${companyId}/notes/${noteId}`),
  create: (companyId: string, input: NoteCreate) =>
    serverRequest<Single<Note>>(`/companies/${companyId}/notes`, { method: "POST", body: input }),
  update: (companyId: string, noteId: string, input: NoteUpdate) =>
    serverRequest<Single<Note>>(`/companies/${companyId}/notes/${noteId}`, { method: "PATCH", body: input }),
  remove: (companyId: string, noteId: string) =>
    serverRequest<void>(`/companies/${companyId}/notes/${noteId}`, { method: "DELETE" }),
};

const tasks = {
  list: (companyId: string, params?: TaskListParams) =>
    serverRequest<Paginated<Task>>(`/companies/${companyId}/tasks`, { query: params }),
  listAll: (params?: TaskListParams) =>
    serverRequest<Paginated<TaskWithCompany>>("/tasks", { query: params }),
  get: (companyId: string, taskId: string) =>
    serverRequest<Single<Task>>(`/companies/${companyId}/tasks/${taskId}`),
  create: (companyId: string, input: TaskCreate) =>
    serverRequest<Single<Task>>(`/companies/${companyId}/tasks`, { method: "POST", body: input }),
  update: (companyId: string, taskId: string, input: TaskUpdate) =>
    serverRequest<Single<Task>>(`/companies/${companyId}/tasks/${taskId}`, { method: "PATCH", body: input }),
  remove: (companyId: string, taskId: string) =>
    serverRequest<void>(`/companies/${companyId}/tasks/${taskId}`, { method: "DELETE" }),
};

const deals = {
  overview: () =>
    serverRequest<Single<DealsOverview>>(`/deals/overview`),
  detail: (dealId: string) =>
    serverRequest<Single<DealDetail>>(`/deals/${dealId}`),
  list: (companyId: string, params?: DealListParams) =>
    serverRequest<Paginated<Deal>>(`/companies/${companyId}/deals`, { query: params }),
  get: (companyId: string, dealId: string) =>
    serverRequest<Single<Deal>>(`/companies/${companyId}/deals/${dealId}`),
  create: (companyId: string, input: DealCreate) =>
    serverRequest<Single<Deal>>(`/companies/${companyId}/deals`, { method: "POST", body: input }),
  update: (companyId: string, dealId: string, input: DealUpdate) =>
    serverRequest<Single<Deal>>(`/companies/${companyId}/deals/${dealId}`, { method: "PATCH", body: input }),
  remove: (companyId: string, dealId: string) =>
    serverRequest<void>(`/companies/${companyId}/deals/${dealId}`, { method: "DELETE" }),
};

const activities = {
  list: (companyId: string, params?: ActivityListParams) =>
    serverRequest<Paginated<Activity>>(`/companies/${companyId}/activities`, { query: params }),
  get: (companyId: string, activityId: string) =>
    serverRequest<Single<Activity>>(`/companies/${companyId}/activities/${activityId}`),
  create: (companyId: string, input: ActivityCreate) =>
    serverRequest<Single<Activity>>(`/companies/${companyId}/activities`, { method: "POST", body: input }),
  update: (companyId: string, activityId: string, input: ActivityUpdate) =>
    serverRequest<Single<Activity>>(`/companies/${companyId}/activities/${activityId}`, { method: "PATCH", body: input }),
  remove: (companyId: string, activityId: string) =>
    serverRequest<void>(`/companies/${companyId}/activities/${activityId}`, { method: "DELETE" }),
};

const tags = {
  list: () => serverRequest<Single<Tag[]>>("/tags"),
  create: (input: TagCreate) =>
    serverRequest<Single<Tag>>("/tags", { method: "POST", body: input }),
  update: (tagId: string, input: TagUpdate) =>
    serverRequest<Single<Tag>>(`/tags/${tagId}`, { method: "PATCH", body: input }),
  remove: (tagId: string) =>
    serverRequest<void>(`/tags/${tagId}`, { method: "DELETE" }),
  addToCompany: (companyId: string, tagId: string) =>
    serverRequest<void>(`/companies/${companyId}/tags/${tagId}`, { method: "PUT" }),
  removeFromCompany: (companyId: string, tagId: string) =>
    serverRequest<void>(`/companies/${companyId}/tags/${tagId}`, { method: "DELETE" }),
};

const events = {
  global: (params?: { limit?: number; cursor?: string }) =>
    serverRequest<Single<EventWithCompany[]>>("/events", { query: params }),
  forCompany: (companyId: string, params?: { limit?: number; cursor?: string }) =>
    serverRequest<Single<EventWithCompany[]>>(`/companies/${companyId}/events`, { query: params }),
};

const search = {
  query: (params: { q: string; limit?: number }) =>
    serverRequest<Single<SearchResults>>("/search", { query: params }),
};

const me = {
  get: () => serverRequest<Single<MeResponse>>("/me"),
};

const organizations = {
  create: (input: OrganizationCreate) =>
    serverRequest<Single<Organization & { role: OrgRole; memberCount: number }>>("/organizations", { method: "POST", body: input }),
  members: () =>
    serverRequest<Single<OrganizationMember[]>>("/organization/members"),
  updateMemberRole: (memberId: string, role: OrgRole) =>
    serverRequest<Single<OrganizationMember>>(`/organization/members/${memberId}`, { method: "PATCH", body: { role } }),
  removeMember: (memberId: string) =>
    serverRequest<void>(`/organization/members/${memberId}`, { method: "DELETE" }),
};

const invites = {
  create: (input: InviteCreate) =>
    serverRequest<Single<Invite>>("/organization/invites", { method: "POST", body: input }),
  list: () =>
    serverRequest<Single<Invite[]>>("/organization/invites"),
  revoke: (inviteId: string) =>
    serverRequest<void>(`/organization/invites/${inviteId}`, { method: "DELETE" }),
  getByToken: (token: string) =>
    serverRequest<Single<{ id: string; email: string; role: OrgRole; organization: { id: string; name: string }; expiresAt: string }>>(`/invites/token/${token}`),
  accept: (token: string) =>
    serverRequest<Single<{ organizationId: string }>>(`/invites/token/${token}/accept`, { method: "POST" }),
};

const pipelines = {
  list: () =>
    serverRequest<Single<Pipeline[]>>("/pipelines"),
  get: (id: string) =>
    serverRequest<Single<Pipeline>>(`/pipelines/${id}`),
  create: (input: PipelineCreate) =>
    serverRequest<Single<Pipeline>>("/pipelines", { method: "POST", body: input }),
  update: (id: string, input: PipelineUpdate) =>
    serverRequest<Single<Pipeline>>(`/pipelines/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) =>
    serverRequest<void>(`/pipelines/${id}`, { method: "DELETE" }),
  createStage: (pipelineId: string, input: PipelineStageCreate) =>
    serverRequest<Single<PipelineStage>>(`/pipelines/${pipelineId}/stages`, { method: "POST", body: input }),
  updateStage: (pipelineId: string, stageId: string, input: PipelineStageUpdate) =>
    serverRequest<Single<PipelineStage>>(`/pipelines/${pipelineId}/stages/${stageId}`, { method: "PATCH", body: input }),
  removeStage: (pipelineId: string, stageId: string) =>
    serverRequest<void>(`/pipelines/${pipelineId}/stages/${stageId}`, { method: "DELETE" }),
};

export const serverApi = {
  me,
  organizations,
  invites,
  dashboard,
  companies,
  contacts,
  addresses,
  phoneNumbers,
  notes,
  tasks,
  deals,
  activities,
  tags,
  events,
  search,
  pipelines,
};
