import type { BetaToolUnion } from "@anthropic-ai/sdk/resources/beta/messages/messages.js";
import { z } from "zod";
import { toolDefinitions } from "./definitions.js";
import type { BackendClient } from "../lib/backend-client.js";
import { BackendError } from "../lib/backend-client.js";
import { logger } from "../lib/logger.js";
import type { AgentPendingAction } from "@crm/shared";

const MAX_RESULT_LENGTH = 8000;

function truncate(data: unknown): string {
  let json = JSON.stringify(data);
  if (json.length <= MAX_RESULT_LENGTH) return json;

  if (Array.isArray(data)) {
    return JSON.stringify({
      items: data.slice(0, 5),
      truncated: true,
      totalAvailable: data.length,
    });
  }
  if (typeof data === "object" && data !== null && "data" in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) {
      return JSON.stringify({
        ...(data as Record<string, unknown>),
        data: inner.slice(0, 5),
        truncated: true,
      });
    }
  }
  return json.slice(0, MAX_RESULT_LENGTH);
}

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

export function buildAnthropicTools(): BetaToolUnion[] {
  return toolDefinitions.map((t, i): BetaToolUnion => {
    const schema = z.toJSONSchema(t.parameters, { target: "draft-7" }) as Record<string, unknown>;
    delete schema.$schema;
    const cache_control =
      i === toolDefinitions.length - 1
        ? ({ type: "ephemeral" as const })
        : undefined;

    return {
      type: "custom",
      name: t.name,
      description: t.description,
      input_schema: schema as never,
      ...(cache_control ? { cache_control } : {}),
    };
  });
}

export async function executeTool(
  backendClient: BackendClient,
  name: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ content: string; isError: boolean }> {
  const tool = toolDefinitions.find((t) => t.name === name);
  if (!tool) {
    return {
      content: JSON.stringify({ error: `Unknown tool: ${name}` }),
      isError: true,
    };
  }

  if (isGatedTool(name)) {
    return {
      content: JSON.stringify({ error: "Tool execution requires user approval." }),
      isError: true,
    };
  }

  const scopedClient = signal ? backendClient.withSignal(signal) : backendClient;
  try {
    const parsed = tool.parameters.parse(input) as Record<string, unknown>;
    const result = await tool.execute(parsed, scopedClient);
    return { content: truncate(result), isError: false };
  } catch (err) {
    if (signal?.aborted) throw err;
    if (err instanceof BackendError) {
      logger.warn(
        { tool: name, status: err.status, code: err.code },
        `Tool error: ${err.message}`,
      );
      return {
        content: JSON.stringify({ error: `${err.code}: ${err.message}` }),
        isError: true,
      };
    }
    if (err instanceof z.ZodError) {
      return {
        content: JSON.stringify({ error: "Tool input failed validation", details: err.issues }),
        isError: true,
      };
    }
    logger.error({ tool: name, err }, "Unexpected tool execution error");
    return {
      content: JSON.stringify({ error: "An unexpected error occurred" }),
      isError: true,
    };
  }
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
