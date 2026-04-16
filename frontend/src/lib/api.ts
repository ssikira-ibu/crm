import { getFirebaseAuth } from "./firebase";
import type {
  Address,
  AddressCreate,
  AddressUpdate,
  Activity,
  ActivityCreate,
  ActivityListParams,
  ActivityUpdate,
  ApiErrorBody,
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
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
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
  signal?: AbortSignal;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, signal } = opts;
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}/api${path}${buildQuery(query)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const err = json as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      err?.error?.code ?? "UNKNOWN",
      err?.error?.message ?? res.statusText ?? "Request failed",
      err?.error?.details,
    );
  }
  return json as T;
}

const dashboard = {
  get: (signal?: AbortSignal) =>
    request<Single<DashboardData>>("/dashboard", { signal }),
};

const customers = {
  list: (params?: CustomerListParams, signal?: AbortSignal) =>
    request<Paginated<CustomerWithCounts>>("/customers", { query: params, signal }),
  get: (id: string, signal?: AbortSignal) =>
    request<Single<CustomerWithRelations>>(`/customers/${id}`, { signal }),
  create: (input: CustomerCreate) =>
    request<Single<Customer>>("/customers", { method: "POST", body: input }),
  update: (id: string, input: CustomerUpdate) =>
    request<Single<Customer>>(`/customers/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) =>
    request<void>(`/customers/${id}`, { method: "DELETE" }),
};

const contacts = {
  list: (customerId: string, signal?: AbortSignal) =>
    request<Paginated<Contact>>(`/customers/${customerId}/contacts`, { signal }),
  get: (customerId: string, contactId: string, signal?: AbortSignal) =>
    request<Single<Contact>>(`/customers/${customerId}/contacts/${contactId}`, { signal }),
  create: (customerId: string, input: ContactCreate) =>
    request<Single<Contact>>(`/customers/${customerId}/contacts`, { method: "POST", body: input }),
  update: (customerId: string, contactId: string, input: ContactUpdate) =>
    request<Single<Contact>>(`/customers/${customerId}/contacts/${contactId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, contactId: string) =>
    request<void>(`/customers/${customerId}/contacts/${contactId}`, { method: "DELETE" }),
};

const addresses = {
  list: (customerId: string, signal?: AbortSignal) =>
    request<Paginated<Address>>(`/customers/${customerId}/addresses`, { signal }),
  get: (customerId: string, addressId: string, signal?: AbortSignal) =>
    request<Single<Address>>(`/customers/${customerId}/addresses/${addressId}`, { signal }),
  create: (customerId: string, input: AddressCreate) =>
    request<Single<Address>>(`/customers/${customerId}/addresses`, { method: "POST", body: input }),
  update: (customerId: string, addressId: string, input: AddressUpdate) =>
    request<Single<Address>>(`/customers/${customerId}/addresses/${addressId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, addressId: string) =>
    request<void>(`/customers/${customerId}/addresses/${addressId}`, { method: "DELETE" }),
};

const phoneNumbers = {
  list: (customerId: string, contactId: string, signal?: AbortSignal) =>
    request<Paginated<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers`, { signal }),
  get: (customerId: string, contactId: string, phoneNumberId: string, signal?: AbortSignal) =>
    request<Single<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`, { signal }),
  create: (customerId: string, contactId: string, input: PhoneNumberCreate) =>
    request<Single<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers`, { method: "POST", body: input }),
  update: (customerId: string, contactId: string, phoneNumberId: string, input: PhoneNumberUpdate) =>
    request<Single<PhoneNumber>>(`/customers/${customerId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, contactId: string, phoneNumberId: string) =>
    request<void>(`/customers/${customerId}/contacts/${contactId}/phone-numbers/${phoneNumberId}`, { method: "DELETE" }),
};

const notes = {
  list: (customerId: string, signal?: AbortSignal) =>
    request<Paginated<Note>>(`/customers/${customerId}/notes`, { signal }),
  get: (customerId: string, noteId: string, signal?: AbortSignal) =>
    request<Single<Note>>(`/customers/${customerId}/notes/${noteId}`, { signal }),
  create: (customerId: string, input: NoteCreate) =>
    request<Single<Note>>(`/customers/${customerId}/notes`, { method: "POST", body: input }),
  update: (customerId: string, noteId: string, input: NoteUpdate) =>
    request<Single<Note>>(`/customers/${customerId}/notes/${noteId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, noteId: string) =>
    request<void>(`/customers/${customerId}/notes/${noteId}`, { method: "DELETE" }),
};

const reminders = {
  list: (customerId: string, params?: ReminderListParams, signal?: AbortSignal) =>
    request<Paginated<Reminder>>(`/customers/${customerId}/reminders`, { query: params, signal }),
  get: (customerId: string, reminderId: string, signal?: AbortSignal) =>
    request<Single<Reminder>>(`/customers/${customerId}/reminders/${reminderId}`, { signal }),
  create: (customerId: string, input: ReminderCreate) =>
    request<Single<Reminder>>(`/customers/${customerId}/reminders`, { method: "POST", body: input }),
  update: (customerId: string, reminderId: string, input: ReminderUpdate) =>
    request<Single<Reminder>>(`/customers/${customerId}/reminders/${reminderId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, reminderId: string) =>
    request<void>(`/customers/${customerId}/reminders/${reminderId}`, { method: "DELETE" }),
};

const deals = {
  list: (customerId: string, params?: DealListParams, signal?: AbortSignal) =>
    request<Paginated<Deal>>(`/customers/${customerId}/deals`, { query: params, signal }),
  get: (customerId: string, dealId: string, signal?: AbortSignal) =>
    request<Single<Deal>>(`/customers/${customerId}/deals/${dealId}`, { signal }),
  create: (customerId: string, input: DealCreate) =>
    request<Single<Deal>>(`/customers/${customerId}/deals`, { method: "POST", body: input }),
  update: (customerId: string, dealId: string, input: DealUpdate) =>
    request<Single<Deal>>(`/customers/${customerId}/deals/${dealId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, dealId: string) =>
    request<void>(`/customers/${customerId}/deals/${dealId}`, { method: "DELETE" }),
};

const activities = {
  list: (customerId: string, params?: ActivityListParams, signal?: AbortSignal) =>
    request<Paginated<Activity>>(`/customers/${customerId}/activities`, { query: params, signal }),
  get: (customerId: string, activityId: string, signal?: AbortSignal) =>
    request<Single<Activity>>(`/customers/${customerId}/activities/${activityId}`, { signal }),
  create: (customerId: string, input: ActivityCreate) =>
    request<Single<Activity>>(`/customers/${customerId}/activities`, { method: "POST", body: input }),
  update: (customerId: string, activityId: string, input: ActivityUpdate) =>
    request<Single<Activity>>(`/customers/${customerId}/activities/${activityId}`, { method: "PATCH", body: input }),
  remove: (customerId: string, activityId: string) =>
    request<void>(`/customers/${customerId}/activities/${activityId}`, { method: "DELETE" }),
};

const tags = {
  list: (signal?: AbortSignal) =>
    request<Single<Tag[]>>("/tags", { signal }),
  create: (input: TagCreate) =>
    request<Single<Tag>>("/tags", { method: "POST", body: input }),
  update: (tagId: string, input: TagUpdate) =>
    request<Single<Tag>>(`/tags/${tagId}`, { method: "PATCH", body: input }),
  remove: (tagId: string) =>
    request<void>(`/tags/${tagId}`, { method: "DELETE" }),
  addToCustomer: (customerId: string, tagId: string) =>
    request<void>(`/customers/${customerId}/tags/${tagId}`, { method: "PUT" }),
  removeFromCustomer: (customerId: string, tagId: string) =>
    request<void>(`/customers/${customerId}/tags/${tagId}`, { method: "DELETE" }),
};

export const api = {
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
};
