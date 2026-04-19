import type {
  CustomerStatus,
  AddressLabel,
  PhoneLabel,
  ActivityType,
  DealStatus,
} from "./enums.js";

export type Customer = {
  id: string;
  userId: string;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  customerId: string;
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
  customerId: string;
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

export type Note = {
  id: string;
  customerId: string;
  contactId: string | null;
  dealId: string | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  id: string;
  customerId: string;
  contactId: string | null;
  dealId: string | null;
  title: string;
  description: string | null;
  dueDate: string;
  dateCompleted: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Deal = {
  id: string;
  customerId: string;
  contactId: string | null;
  title: string;
  description: string | null;
  value: number;
  status: DealStatus;
  expectedCloseDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  customerId: string;
  contactId: string | null;
  dealId: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type Tag = {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Event = {
  id: string;
  userId: string;
  customerId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type EventWithCustomer = Event & {
  customer: { id: string; companyName: string | null; status: CustomerStatus };
};

export type CustomerWithCounts = Customer & {
  _count: {
    contacts: number;
    reminders: number;
    notes: number;
    deals: number;
    activities: number;
  };
};

export type CustomerWithRelations = Customer & {
  contacts: (Contact & { phoneNumbers: PhoneNumber[] })[];
  addresses: Address[];
  deals: Deal[];
  activities: Activity[];
  notes: Note[];
  reminders: Reminder[];
  tags: Tag[];
};

export type ReminderWithCustomer = Reminder & {
  customer: { id: string; companyName: string | null; status: CustomerStatus };
};

export type NoteWithCustomer = Note & {
  customer: { id: string; companyName: string | null };
};

export type DealWithCustomer = Deal & {
  customer: { id: string; companyName: string | null; status: CustomerStatus };
};

export type ActivityWithCustomer = Activity & {
  customer: { id: string; companyName: string | null };
};

export type DashboardData = {
  reminders: ReminderWithCustomer[];
  recentNotes: NoteWithCustomer[];
  recentActivities: ActivityWithCustomer[];
  deals: DealWithCustomer[];
  stats: {
    total: number;
    byStatus: Partial<Record<CustomerStatus, number>>;
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

export type SearchResultItem = {
  id: string;
  type: "customer" | "contact" | "deal" | "note" | "activity" | "reminder";
  title: string;
  subtitle: string | null;
  customerId: string;
  customerName: string | null;
  similarity: number;
};

export type SearchResults = {
  query: string;
  results: SearchResultItem[];
};
