export const CUSTOMER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "LEAD",
  "PROSPECT",
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

export const DEAL_STATUSES = ["OPEN", "WON", "LOST"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export type AddressLabel = (typeof ADDRESS_LABELS)[number];
export type PhoneLabel = (typeof PHONE_LABELS)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type DealStatus = (typeof DEAL_STATUSES)[number];
