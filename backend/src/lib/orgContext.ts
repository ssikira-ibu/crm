import type { OrgContext } from "@crm/shared";
import type { OrgUser } from "../types/index.js";
import { AppError } from "../middleware/errorHandler.js";

export function getOrgContext(user: OrgUser): OrgContext {
  return {
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
    actor: user.actor ?? { type: "user" },
  };
}

/**
 * Guard for endpoints that mutate data via the confirmation-gated tool set
 * (update_deal / update_task / update_company / tag attach-detach).
 *
 * If the request was made by the agent service, the only legitimate path is
 * through the approval handler in agent.service.ts, which sets a `toolCallId`
 * on the actor before invoking the underlying service. Direct agent calls
 * without a toolCallId are rejected so a compromised or prompt-injected
 * agent cannot bypass the user approval gate even though it holds a valid
 * S2S token.
 */
export function assertHumanOrApprovedAgent(ctx: OrgContext): void {
  const actor = ctx.actor ?? { type: "user" };
  if (actor.type === "agent" && !actor.toolCallId) {
    throw new AppError(
      403,
      "AGENT_APPROVAL_REQUIRED",
      "This action requires explicit user approval via the agent workflow",
    );
  }
}
