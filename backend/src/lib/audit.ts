import { logger } from "./logger.js";

type AuditEvent = {
  action: string;
  actorId: string;
  organizationId: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export function auditLog(event: AuditEvent) {
  logger.info({ audit: true, ...event }, `audit: ${event.action}`);
}
