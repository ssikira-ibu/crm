export {
  COMPANY_STATUSES,
  ADDRESS_LABELS,
  PHONE_LABELS,
  ACTIVITY_TYPES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_ENTITIES,
  ORG_ROLES,
  INVITE_STATUSES,
} from "@crm/shared";

export type {
  CompanyStatus,
  AddressLabel,
  PhoneLabel,
  ActivityType,
  TaskStatus,
  TaskPriority,
  CustomFieldType,
  CustomFieldEntity,
  User,
  Company,
  Contact,
  Address,
  PhoneNumber,
  Note,
  Task,
  TaskWithCompany,
  Deal,
  DealDetail,
  DealWithCompany,
  Activity,
  ActivityWithCompany,
  NoteWithCompany,
  Tag,
  CompanyWithCounts,
  CompanyWithRelations,
  Event,
  EventWithCompany,
  Pipeline,
  PipelineStage,
  CustomFieldDefinition,
  CustomFieldValue,
  DashboardData,
  DealsOverview,
  DealsOverviewMetrics,
  DealsOverviewStageSummary,
  PageMeta,
  Single,
  Paginated,
  ApiErrorBody,
  SearchResults,
  SearchResultItem,
  Organization,
  OrganizationMember,
  Invite,
  OrgRole,
  InviteStatus,
  OrgContext,
  MeResponse,
  CreateCompanyInput as CompanyCreate,
  UpdateCompanyInput as CompanyUpdate,
  CompanyQueryParams as CompanyListParams,
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
  CreateOrganizationInput as OrganizationCreate,
  CreateInviteInput as InviteCreate,
  UpdateMemberRoleInput as MemberRoleUpdate,
  CreatePipelineInput as PipelineCreate,
  UpdatePipelineInput as PipelineUpdate,
  CreatePipelineStageInput as PipelineStageCreate,
  UpdatePipelineStageInput as PipelineStageUpdate,
} from "@crm/shared";

import type { ActivityType, TaskStatus, TaskPriority } from "@crm/shared";

// Frontend sends dates as ISO strings over JSON.
// The backend Zod schemas use z.coerce.date() for validation,
// so these types reflect the wire format rather than the parsed type.

export type TaskCreate = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeId?: string;
  contactId?: string;
  dealId?: string;
};
export type TaskUpdate = Partial<TaskCreate> & {
  dueDate?: string | null;
  assigneeId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
};
export type TaskListParams = {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  completed?: boolean;
  dueBefore?: string;
};

export type DealCreate = {
  title: string;
  description?: string;
  value: number;
  stageId: string;
  pipelineId?: string;
  expectedCloseDate?: string;
  contactId?: string;
};
export type DealUpdate = Partial<{
  title: string;
  description: string;
  value: number;
  expectedCloseDate: string;
  contactId: string | null;
  stageId: string;
}>;
export type DealListParams = {
  page?: number;
  limit?: number;
  pipelineId?: string;
  stageId?: string;
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
