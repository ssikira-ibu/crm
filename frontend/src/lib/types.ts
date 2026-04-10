export type CustomerStatus = "ACTIVE" | "INACTIVE" | "LEAD" | "PROSPECT";
export type AddressLabel = "MAIN" | "BILLING" | "SHIPPING" | "OTHER";
export type PhoneLabel = "WORK" | "MOBILE" | "HOME" | "FAX" | "OTHER";

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "LEAD",
  "PROSPECT",
];
export const ADDRESS_LABELS: AddressLabel[] = [
  "MAIN",
  "BILLING",
  "SHIPPING",
  "OTHER",
];
export const PHONE_LABELS: PhoneLabel[] = [
  "WORK",
  "MOBILE",
  "HOME",
  "FAX",
  "OTHER",
];

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
  customerId: string;
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
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  id: string;
  customerId: string;
  title: string;
  description: string | null;
  dueDate: string;
  dateCompleted: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerWithRelations = Customer & {
  contacts: Contact[];
  addresses: Address[];
  phoneNumbers: PhoneNumber[];
  notes: Note[];
  reminders: Reminder[];
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

export type CustomerListParams = {
  page?: number;
  limit?: number;
  status?: CustomerStatus;
  search?: string;
};

export type CustomerCreate = {
  companyName?: string;
  industry?: string;
  website?: string;
  status?: CustomerStatus;
};
export type CustomerUpdate = Partial<CustomerCreate>;

export type ContactCreate = {
  firstName: string;
  lastName: string;
  email?: string;
  jobTitle?: string;
  isPrimary?: boolean;
};
export type ContactUpdate = Partial<ContactCreate>;

export type AddressCreate = {
  label?: AddressLabel;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
};
export type AddressUpdate = Partial<AddressCreate>;

export type PhoneNumberCreate = {
  label?: PhoneLabel;
  number: string;
  extension?: string;
  isPrimary?: boolean;
};
export type PhoneNumberUpdate = Partial<PhoneNumberCreate>;

export type NoteCreate = { title: string; body: string };
export type NoteUpdate = Partial<NoteCreate>;

export type ReminderListParams = {
  page?: number;
  limit?: number;
  completed?: boolean;
  dueBefore?: string;
};

export type ReminderCreate = {
  title: string;
  description?: string;
  dueDate: string;
  dateCompleted?: string | null;
};
export type ReminderUpdate = Partial<ReminderCreate>;
