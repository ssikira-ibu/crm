import { config } from "../config.js";
import { createDelegatedToken } from "./auth.js";
import { logger } from "./logger.js";

export interface RequestContext {
  uid: string;
  email: string;
  conversationId?: string;
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

async function request<T>(
  ctx: RequestContext,
  method: string,
  path: string,
  opts?: { query?: Query; body?: unknown },
): Promise<T> {
  const token = await createDelegatedToken(ctx.uid, ctx.email, ctx.conversationId);
  const url = `${config.BACKEND_URL}/api${path}${buildQuery(opts?.query)}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (opts?.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = json as { error?: { code?: string; message?: string } } | null;
    const message = err?.error?.message ?? res.statusText ?? "Request failed";
    logger.warn({ status: res.status, path, code: err?.error?.code }, `Backend error: ${message}`);
    throw new BackendError(res.status, err?.error?.code ?? "UNKNOWN", message);
  }

  return json as T;
}

export class BackendError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "BackendError";
  }
}

export function createBackendClient(ctx: RequestContext) {
  const get = <T>(path: string, query?: Query) =>
    request<T>(ctx, "GET", path, { query });
  const post = <T>(path: string, body?: unknown) =>
    request<T>(ctx, "POST", path, { body });
  const patch = <T>(path: string, body?: unknown) =>
    request<T>(ctx, "PATCH", path, { body });
  const put = <T>(path: string, body?: unknown) =>
    request<T>(ctx, "PUT", path, { body });
  const del = <T>(path: string) =>
    request<T>(ctx, "DELETE", path);

  return {
    // Dashboard
    getDashboard: () => get("/dashboard"),

    // Search
    search: (q: string, limit?: number) =>
      get("/search", { q, limit }),

    // Companies
    listCompanies: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
      get("/companies", params),
    getCompany: (id: string) => get(`/companies/${id}`),
    createCompany: (body: unknown) => post("/companies", body),
    updateCompany: (id: string, body: unknown) => patch(`/companies/${id}`, body),

    // Contacts
    listContacts: (companyId: string) => get(`/companies/${companyId}/contacts`),
    getContact: (companyId: string, contactId: string) =>
      get(`/companies/${companyId}/contacts/${contactId}`),
    createContact: (companyId: string, body: unknown) =>
      post(`/companies/${companyId}/contacts`, body),
    updateContact: (companyId: string, contactId: string, body: unknown) =>
      patch(`/companies/${companyId}/contacts/${contactId}`, body),

    // Deals
    listDeals: (companyId: string, params?: { page?: number; limit?: number; pipelineId?: string; stageId?: string }) =>
      get(`/companies/${companyId}/deals`, params),
    getDealDetail: (dealId: string) => get(`/deals/${dealId}`),
    getDealsOverview: () => get("/deals/overview"),
    createDeal: (companyId: string, body: unknown) =>
      post(`/companies/${companyId}/deals`, body),
    updateDeal: (companyId: string, dealId: string, body: unknown) =>
      patch(`/companies/${companyId}/deals/${dealId}`, body),

    // Activities
    listActivities: (companyId: string, params?: { type?: string }) =>
      get(`/companies/${companyId}/activities`, params),
    createActivity: (companyId: string, body: unknown) =>
      post(`/companies/${companyId}/activities`, body),
    updateActivity: (companyId: string, activityId: string, body: unknown) =>
      patch(`/companies/${companyId}/activities/${activityId}`, body),

    // Notes
    listNotes: (companyId: string) => get(`/companies/${companyId}/notes`),
    createNote: (companyId: string, body: unknown) =>
      post(`/companies/${companyId}/notes`, body),
    updateNote: (companyId: string, noteId: string, body: unknown) =>
      patch(`/companies/${companyId}/notes/${noteId}`, body),

    // Tasks
    listTasks: (params?: { page?: number; limit?: number; status?: string; priority?: string; assigneeId?: string; dueBefore?: string }) =>
      get("/tasks", params),
    listCompanyTasks: (companyId: string, params?: { status?: string; priority?: string }) =>
      get(`/companies/${companyId}/tasks`, params),
    createTask: (body: unknown) => post("/tasks", body),
    createCompanyTask: (companyId: string, body: unknown) =>
      post(`/companies/${companyId}/tasks`, body),
    updateTask: (taskId: string, body: unknown) =>
      patch(`/tasks/${taskId}`, body),
    updateCompanyTask: (companyId: string, taskId: string, body: unknown) =>
      patch(`/companies/${companyId}/tasks/${taskId}`, body),

    // Tags
    listTags: () => get("/tags"),
    addTagToCompany: (companyId: string, tagId: string) =>
      put(`/companies/${companyId}/tags/${tagId}`),
    removeTagFromCompany: (companyId: string, tagId: string) =>
      del(`/companies/${companyId}/tags/${tagId}`),

    // Events
    listEvents: (params?: { limit?: number; cursor?: string }) =>
      get("/events", params),
    listCompanyEvents: (companyId: string, params?: { limit?: number; cursor?: string }) =>
      get(`/companies/${companyId}/events`, params),

    // Pipelines
    listPipelines: () => get("/pipelines"),

    // User
    getMe: () => get("/me"),
  };
}

export type BackendClient = ReturnType<typeof createBackendClient>;
