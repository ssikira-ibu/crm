import "server-only";
import { SignJWT } from "jose";
import { getSession } from "./session";
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
  Customer,
  CustomerWithCounts,
  DashboardData,
  CustomerCreate,
  CustomerListParams,
  CustomerUpdate,
  CustomerWithRelations,
  Deal,
  DealCreate,
  DealListParams,
  DealUpdate,
  Note,
  NoteCreate,
  NoteUpdate,
  Paginated,
  PhoneNumber,
  PhoneNumberCreate,
  PhoneNumberUpdate,
  Reminder,
  ReminderCreate,
  ReminderListParams,
  ReminderUpdate,
  Single,
  Tag,
  TagCreate,
  TagUpdate,
  EventWithCustomer,
} from "./types";

const API_URL =
  (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000";

const S2S_JWT_SECRET = process.env.S2S_JWT_SECRET!;
const encodedKey = new TextEncoder().encode(S2S_JWT_SECRET);

async function createS2SToken(uid: string, email: string): Promise<string> {
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

const customers = {
  list: (params?: CustomerListParams) =>
    serverRequest<Paginated<CustomerWithCounts>>("/customers", { query: params }),
  get: (id: string) =>
    serverRequest<Single<CustomerWithRelations>>(`/customers/${id}`),
  create: (input: CustomerCreate) =>
    serverRequest<Single<Customer>>("/customers", { method: "POST", body: input }),
  update: (id: string, input: CustomerUpdate) =>
    serverRequest<Single<Customer>>(`/customers/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) =>
    serverRequest<void>(`/customers/${id}`, { method: "DELETE" }),
};

const contacts = {
  list: (customerId: string) =>
    serverRequest<Paginated<Contact>>(`/customers/${customerId}/contacts`),
  get: (customerId: string, contactId: string) =>
    serverRequest<Single<Contact>>(`/customers/${customerId}/contacts/${contactId}`),
  create: (customerId: string, input: ContactCreate) =>
    serverRequest<Single<Contact>>(`/customers/${customerId}/contacts`, { method: "POST", body: input }),
  update: (customerId: string, contactId: string, input: ContactUpdate) =>
    serverRequest<Single<Contact>>(`/customers/${customerId}/contacts/${contactId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, contactId: string) =>
    serverRequest<void>(`/customers/${customerId}/contacts/${contactId}`, { method: "DELETE" }),
};

const addresses = {
  list: (customerId: string) =>
    serverRequest<Paginated<Address>>(`/customers/${customerId}/addresses`),
  get: (customerId: string, addressId: string) =>
    serverRequest<Single<Address>>(`/customers/${customerId}/addresses/${addressId}`),
  create: (customerId: string, input: AddressCreate) =>
    serverRequest<Single<Address>>(`/customers/${customerId}/addresses`, { method: "POST", body: input }),
  update: (customerId: string, addressId: string, input: AddressUpdate) =>
    serverRequest<Single<Address>>(`/customers/${customerId}/addresses/${addressId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, addressId: string) =>
    serverRequest<void>(`/customers/${customerId}/addresses/${addressId}`, { method: "DELETE" }),
};

const phoneNumbers = {
  list: (customerId: string, contactId: string) =>
    serverRequest<Paginated<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers`),
  get: (customerId: string, contactId: string, phoneNumberId: string) =>
    serverRequest<Single<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`),
  create: (customerId: string, contactId: string, input: PhoneNumberCreate) =>
    serverRequest<Single<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers`, { method: "POST", body: input }),
  update: (customerId: string, contactId: string, phoneNumberId: string, input: PhoneNumberUpdate) =>
    serverRequest<Single<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, contactId: string, phoneNumberId: string) =>
    serverRequest<void>(`/customers/${customerId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`, { method: "DELETE" }),
};

const notes = {
  list: (customerId: string) =>
    serverRequest<Paginated<Note>>(`/customers/${customerId}/notes`),
  get: (customerId: string, noteId: string) =>
    serverRequest<Single<Note>>(`/customers/${customerId}/notes/${noteId}`),
  create: (customerId: string, input: NoteCreate) =>
    serverRequest<Single<Note>>(`/customers/${customerId}/notes`, { method: "POST", body: input }),
  update: (customerId: string, noteId: string, input: NoteUpdate) =>
    serverRequest<Single<Note>>(`/customers/${customerId}/notes/${noteId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, noteId: string) =>
    serverRequest<void>(`/customers/${customerId}/notes/${noteId}`, { method: "DELETE" }),
};

const reminders = {
  list: (customerId: string, params?: ReminderListParams) =>
    serverRequest<Paginated<Reminder>>(`/customers/${customerId}/reminders`, { query: params }),
  get: (customerId: string, reminderId: string) =>
    serverRequest<Single<Reminder>>(`/customers/${customerId}/reminders/${reminderId}`),
  create: (customerId: string, input: ReminderCreate) =>
    serverRequest<Single<Reminder>>(`/customers/${customerId}/reminders`, { method: "POST", body: input }),
  update: (customerId: string, reminderId: string, input: ReminderUpdate) =>
    serverRequest<Single<Reminder>>(`/customers/${customerId}/reminders/${reminderId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, reminderId: string) =>
    serverRequest<void>(`/customers/${customerId}/reminders/${reminderId}`, { method: "DELETE" }),
};

const deals = {
  list: (customerId: string, params?: DealListParams) =>
    serverRequest<Paginated<Deal>>(`/customers/${customerId}/deals`, { query: params }),
  get: (customerId: string, dealId: string) =>
    serverRequest<Single<Deal>>(`/customers/${customerId}/deals/${dealId}`),
  create: (customerId: string, input: DealCreate) =>
    serverRequest<Single<Deal>>(`/customers/${customerId}/deals`, { method: "POST", body: input }),
  update: (customerId: string, dealId: string, input: DealUpdate) =>
    serverRequest<Single<Deal>>(`/customers/${customerId}/deals/${dealId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, dealId: string) =>
    serverRequest<void>(`/customers/${customerId}/deals/${dealId}`, { method: "DELETE" }),
};

const activities = {
  list: (customerId: string, params?: ActivityListParams) =>
    serverRequest<Paginated<Activity>>(`/customers/${customerId}/activities`, { query: params }),
  get: (customerId: string, activityId: string) =>
    serverRequest<Single<Activity>>(`/customers/${customerId}/activities/${activityId}`),
  create: (customerId: string, input: ActivityCreate) =>
    serverRequest<Single<Activity>>(`/customers/${customerId}/activities`, { method: "POST", body: input }),
  update: (customerId: string, activityId: string, input: ActivityUpdate) =>
    serverRequest<Single<Activity>>(`/customers/${customerId}/activities/${activityId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, activityId: string) =>
    serverRequest<void>(`/customers/${customerId}/activities/${activityId}`, { method: "DELETE" }),
};

const tags = {
  list: () => serverRequest<Single<Tag[]>>("/tags"),
  create: (input: TagCreate) =>
    serverRequest<Single<Tag>>("/tags", { method: "POST", body: input }),
  update: (tagId: string, input: TagUpdate) =>
    serverRequest<Single<Tag>>(`/tags/${tagId}`, { method: "PATCH", body: input }),
  remove: (tagId: string) =>
    serverRequest<void>(`/tags/${tagId}`, { method: "DELETE" }),
  addToCustomer: (customerId: string, tagId: string) =>
    serverRequest<void>(`/customers/${customerId}/tags/${tagId}`, { method: "PUT" }),
  removeFromCustomer: (customerId: string, tagId: string) =>
    serverRequest<void>(`/customers/${customerId}/tags/${tagId}`, { method: "DELETE" }),
};

const events = {
  global: (params?: { limit?: number; cursor?: string }) =>
    serverRequest<Single<EventWithCustomer[]>>("/events", { query: params }),
  forCustomer: (customerId: string, params?: { limit?: number; cursor?: string }) =>
    serverRequest<Single<EventWithCustomer[]>>(`/customers/${customerId}/events`, { query: params }),
};

export const serverApi = {
  dashboard,
  customers,
  contacts,
  addresses,
  phoneNumbers,
  notes,
  reminders,
  deals,
  activities,
  tags,
  events,
};
