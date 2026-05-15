import type Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import { toolDefinitions, type ToolDefinition } from "./definitions.js";
import type { BackendClient } from "../lib/backend-client.js";
import { BackendError } from "../lib/backend-client.js";
import { logger } from "../lib/logger.js";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
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
): Promise<ToolResult> {
  const tool = toolMap.get(name);
  if (!tool) {
    return { success: false, error: `Unknown tool: ${name}` };
  }

  try {
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
