import type { OrgRole } from "@crm/shared";

export interface AuthUser {
  uid: string;
  email: string;
}

export interface OrgUser extends AuthUser {
  organizationId: string;
  role: OrgRole;
}

export interface AppState {
  user: OrgUser;
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

export interface AuthOnlyState {
  user: AuthUser;
  body?: unknown;
  query?: unknown;
  params?: unknown;
}
