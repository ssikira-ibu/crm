import type { OrgContext } from "@crm/shared";
import type { OrgUser } from "../types/index.js";

export function getOrgContext(user: OrgUser): OrgContext {
  return {
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
  };
}
