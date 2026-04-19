export {
  CUSTOMER_STATUSES,
  ADDRESS_LABELS,
  PHONE_LABELS,
  ACTIVITY_TYPES,
  DEAL_STATUSES,
} from "@crm/shared";

export type {
  CustomerStatus,
  AddressLabel,
  PhoneLabel,
  ActivityType,
  DealStatus,
  Customer,
  Contact,
  Address,
  PhoneNumber,
  Note,
  Reminder,
  Deal,
  Activity,
  Tag,
  CustomerWithCounts,
  CustomerWithRelations,
  ReminderWithCustomer,
  NoteWithCustomer,
  Event,
  EventWithCustomer,
  DealWithCustomer,
  ActivityWithCustomer,
  DashboardData,
  PageMeta,
  Single,
  Paginated,
  ApiErrorBody,
  SearchResults,
  SearchResultItem,
  SearchQueryParams,
  CreateCustomerInput as CustomerCreate,
  UpdateCustomerInput as CustomerUpdate,
  CustomerQueryParams as CustomerListParams,
  CreateContactInput as ContactCreate,
  UpdateContactInput as ContactUpdate,
  CreateAddressInput as AddressCreate,
  UpdateAddressInput as AddressUpdate,
  CreatePhoneNumberInput as PhoneNumberCreate,
  UpdatePhoneNumberInput as PhoneNumberUpdate,
  CreateNoteInput as NoteCreate,
  UpdateNoteInput as NoteUpdate,
  CreateTagInput as TagCreate,
  UpdateTagInput as TagUpdate,
} from "@crm/shared";

import type { ActivityType, DealStatus } from "@crm/shared";

// Frontend sends dates as ISO strings over JSON.
// The backend Zod schemas use z.coerce.date() for validation,
// so these types reflect the wire format rather than the parsed type.

export type ReminderCreate = {
  title: string;
  description?: string;
  dueDate: string;
  dateCompleted?: string | null;
  contactId?: string;
  dealId?: string;
};
export type ReminderUpdate = Partial<ReminderCreate>;
export type ReminderListParams = {
  page?: number;
  limit?: number;
  completed?: boolean;
  dueBefore?: string;
};

export type DealCreate = {
  title: string;
  description?: string;
  value: number;
  status?: DealStatus;
  expectedCloseDate?: string;
  contactId?: string;
};
export type DealUpdate = Partial<DealCreate>;
export type DealListParams = {
  page?: number;
  limit?: number;
  status?: DealStatus;
};

export type ActivityCreate = {
  type: ActivityType;
  title: string;
  description?: string;
  date: string;
  contactId?: string;
  dealId?: string;
};
export type ActivityUpdate = Partial<ActivityCreate>;
export type ActivityListParams = {
  page?: number;
  limit?: number;
  type?: ActivityType;
};
