import type { AgentMessage } from "@crm/shared";

export interface ConversationRecord {
  id: string;
  userId: string;
  organizationId: string;
  title: string | null;
  messages: AgentMessage[];
  tokenUsage: number;
  createdAt: string;
  updatedAt: string;
}
