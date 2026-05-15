import type Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import { toolDefinitions, type ToolDefinition } from "./definitions.js";
import type { BackendClient } from "../lib/backend-client.js";
import { BackendError } from "../lib/backend-client.js";
import { logger } from "../lib/logger.js";
import type { AgentPendingAction } from "@crm/shared";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresConfirmation?: boolean;
  action?: AgentPendingAction;
}

const MAX_RESULT_LENGTH = 8000;

function truncateResult(data: unknown): unknown {
  const json = JSON.stringify(data);
  if (json.length <= MAX_RESULT_LENGTH) return data;

  if (Array.isArray(data)) {
    const truncated = data.slice(0, 5);
    return { items: truncated, truncated: true, totalAvailable: data.length };
  }

  if (typeof data === "object" && data !== null && "data" in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) {
      const truncated = inner.slice(0, 5);
      return { ...data as Record<string, unknown>, data: truncated, truncated: true };
    }
  }

  return JSON.parse(json.slice(0, MAX_RESULT_LENGTH));
}

const toolMap = new Map<string, ToolDefinition>(
  toolDefinitions.map((t) => [t.name, t]),
);

const CONFIRMATION_REQUIRED_TOOLS = new Set([
  "update_deal",
  "update_task",
  "update_company",
  "add_tag_to_company",
  "remove_tag_from_company",
]);

function summarizeAction(name: string, params: Record<string, unknown>): string {
  switch (name) {
    case "update_deal":
      return `Update deal ${String(params.dealId)}`;
    case "update_task":
      return `Update task ${String(params.taskId)}`;
    case "update_company":
      return `Update company ${String(params.companyId)}`;
    case "add_tag_to_company":
      return `Add tag ${String(params.tagId)} to company ${String(params.companyId)}`;
    case "remove_tag_from_company":
      return `Remove tag ${String(params.tagId)} from company ${String(params.companyId)}`;
    default:
      return `Run ${name}`;
  }
}

export function getAnthropicTools(): Anthropic.Messages.Tool[] {
  return toolDefinitions.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: zodToJsonSchema(t.parameters as never, {
      target: "openApi3",
    }) as Anthropic.Messages.Tool.InputSchema,
  }));
}

export function getOpenAITools(): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return toolDefinitions.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: zodToJsonSchema(t.parameters as never, {
        target: "openApi3",
      }) as Record<string, unknown>,
    },
  }));
}

export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  client: BackendClient,
  toolCallId?: string,
): Promise<ToolResult> {
  const tool = toolMap.get(name);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${name}` };
  }

  try {
    if (CONFIRMATION_REQUIRED_TOOLS.has(name)) {
      if (!toolCallId) {
        return { success: false, error: "Tool call id is required for confirmation-gated actions" };
      }
      const conversationId = client.context.conversationId;
      if (!conversationId) {
        return { success: false, error: "Conversation id is required for confirmation-gated actions" };
      }

      const action = await client.createAgentAction({
        conversationId,
        toolCallId,
        toolName: name,
        risk: "destructive",
        summary: summarizeAction(name, params),
        input: params,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      return {
        success: false,
        requiresConfirmation: true,
        action: action.data,
        error: "This action requires explicit user confirmation before it can run.",
      };
    }

    const result = await tool.execute(params, client);
    return { success: true, data: truncateResult(result) };
  } catch (err) {
    if (err instanceof BackendError) {
      logger.warn({ tool: name, status: err.status, code: err.code }, `Tool error: ${err.message}`);
      return { success: false, error: `${err.code}: ${err.message}` };
    }
    logger.error({ tool: name, err }, "Unexpected tool execution error");
    return { success: false, error: "An unexpected error occurred" };
  }
}
