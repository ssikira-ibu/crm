import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { toolDefinitions, type ToolDefinition } from "./definitions.js";
import type { BackendClient } from "../lib/backend-client.js";
import { BackendError } from "../lib/backend-client.js";
import { logger } from "../lib/logger.js";
import type { AgentPendingAction } from "@crm/shared";

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolPendingResult {
  pending: true;
  action: AgentPendingAction;
}

export type ToolResult = ToolExecutionResult | ToolPendingResult;

const MAX_RESULT_LENGTH = 8000;

function truncate(data: unknown): unknown {
  const json = JSON.stringify(data);
  if (json.length <= MAX_RESULT_LENGTH) return data;

  if (Array.isArray(data)) {
    return { items: data.slice(0, 5), truncated: true, totalAvailable: data.length };
  }
  if (typeof data === "object" && data !== null && "data" in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) {
      return { ...(data as Record<string, unknown>), data: inner.slice(0, 5), truncated: true };
    }
  }
  return JSON.parse(json.slice(0, MAX_RESULT_LENGTH));
}

const toolMap = new Map<string, ToolDefinition>(
  toolDefinitions.map((t) => [t.name, t]),
);

const GATED_TOOLS = new Set([
  "update_deal",
  "update_task",
  "update_company",
  "add_tag_to_company",
  "remove_tag_from_company",
]);

export function isGatedTool(name: string): boolean {
  return GATED_TOOLS.has(name);
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return toolMap.get(name);
}

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

// Build the Anthropic tool list once. The final tool carries a cache_control marker
// so Anthropic caches both the tool definitions and the system prompt (which is
// applied separately).
let cachedAnthropicTools: Anthropic.Messages.Tool[] | null = null;

export function getAnthropicTools(): Anthropic.Messages.Tool[] {
  if (cachedAnthropicTools) return cachedAnthropicTools;
  const tools = toolDefinitions.map((t) => {
    // Zod 4 ships a built-in JSON Schema converter; the legacy
    // `zod-to-json-schema` package returns `{}` for Zod 4 schemas, which
    // Anthropic rejects with `input_schema.type: Field required`.
    const schema = z.toJSONSchema(t.parameters, { target: "draft-7" }) as Record<string, unknown>;
    // Anthropic doesn't want `$schema` in the tool definition.
    delete schema.$schema;
    return {
      name: t.name,
      description: t.description,
      input_schema: schema as Anthropic.Messages.Tool.InputSchema,
    };
  });
  // Mark the last tool for prompt caching — the cache breakpoint covers all
  // preceding tool definitions plus the system prompt above it.
  if (tools.length > 0) {
    (tools[tools.length - 1] as Anthropic.Messages.Tool & {
      cache_control?: { type: "ephemeral" };
    }).cache_control = { type: "ephemeral" };
  }
  cachedAnthropicTools = tools;
  return tools;
}

export async function createPendingAction(
  client: BackendClient,
  toolName: string,
  toolCallId: string,
  params: Record<string, unknown>,
): Promise<AgentPendingAction> {
  const conversationId = client.context.conversationId;
  if (!conversationId) {
    throw new Error("conversationId required to create pending action");
  }
  const response = await client.createAgentAction({
    conversationId,
    toolCallId,
    toolName,
    risk: "destructive",
    summary: summarizeAction(toolName, params),
    input: params,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  return response.data;
}

export async function executeReadOrCreateTool(
  name: string,
  params: Record<string, unknown>,
  client: BackendClient,
): Promise<ToolExecutionResult> {
  const tool = toolMap.get(name);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${name}` };
  }
  if (isGatedTool(name)) {
    return {
      success: false,
      error: "Internal error: gated tools must go through createPendingAction",
    };
  }
  try {
    const result = await tool.execute(params, client);
    return { success: true, data: truncate(result) };
  } catch (err) {
    if (err instanceof BackendError) {
      logger.warn({ tool: name, status: err.status, code: err.code }, `Tool error: ${err.message}`);
      return { success: false, error: `${err.code}: ${err.message}` };
    }
    logger.error({ tool: name, err }, "Unexpected tool execution error");
    return { success: false, error: "An unexpected error occurred" };
  }
}
