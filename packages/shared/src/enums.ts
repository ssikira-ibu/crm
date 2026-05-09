export const COMPANY_STATUSES = [
  "LEAD",
  "PROSPECT",
  "ACTIVE",
  "INACTIVE",
] as const;

export const ADDRESS_LABELS = [
  "MAIN",
  "BILLING",
  "SHIPPING",
  "OTHER",
] as const;

export const PHONE_LABELS = [
  "WORK",
  "MOBILE",
  "HOME",
  "FAX",
  "OTHER",
] as const;

export const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "MEETING",
  "OTHER",
] as const;

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const CUSTOM_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SELECT",
] as const;

export const CUSTOM_FIELD_ENTITIES = [
  "COMPANY",
  "CONTACT",
  "DEAL",
] as const;

export const ORG_ROLES = ["ADMIN", "MANAGER", "SALESPERSON"] as const;

export const INVITE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];
export type AddressLabel = (typeof ADDRESS_LABELS)[number];
export type PhoneLabel = (typeof PHONE_LABELS)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];
export type OrgRole = (typeof ORG_ROLES)[number];
export type InviteStatus = (typeof INVITE_STATUSES)[number];
