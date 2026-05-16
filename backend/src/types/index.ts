import type { OrgRole, RequestActor } from "@crm/shared";

export type ActorInfo = Extract<RequestActor, { type: "agent" }>;

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string | null;
  actor?: ActorInfo | null;
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
