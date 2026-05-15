import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool.js";
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

/**
 * Build the tool list the SDK's `toolRunner` consumes. Each tool carries:
 *  - `input_schema` derived from its Zod schema (sent to Anthropic),
 *  - `parse` so the runner validates LLM-produced args against Zod,
 *  - `run` to execute the tool against our backend.
 *
 * Gated tools (destructive mutations) ship with a `run` that throws. The
 * agent loop short-circuits before tools run when a gated tool_use is
 * detected, so `run` is unreachable in normal flow; if the loop's gating
 * logic ever regressed, this throw would surface that bug loudly rather
 * than silently executing the destructive action.
 */
export function buildRunnableTools(backendClient: BackendClient): BetaRunnableTool[] {
  const tools = toolDefinitions.map((t, i): BetaRunnableTool => {
    const schema = z.toJSONSchema(t.parameters, { target: "draft-7" }) as Record<string, unknown>;
    delete schema.$schema;
    // Cache the system prompt + tool definitions; the marker on the last
    // tool covers everything above it.
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
      parse: (raw: unknown) => t.parameters.parse(raw),
      run: async (args: Record<string, unknown>) => {
        if (isGatedTool(t.name)) {
          // The loop should never let a gated tool reach `run`; if it does,
          // that's a bug — fail loudly instead of mutating data.
          throw new Error(
            `Gated tool ${t.name} reached run() — agent loop did not pause`,
          );
        }
        try {
          const result = await t.execute(args, backendClient);
          return truncate(result);
        } catch (err) {
          if (err instanceof BackendError) {
            logger.warn(
              { tool: t.name, status: err.status, code: err.code },
              `Tool error: ${err.message}`,
            );
            return JSON.stringify({ error: `${err.code}: ${err.message}` });
          }
          logger.error({ tool: t.name, err }, "Unexpected tool execution error");
          return JSON.stringify({ error: "An unexpected error occurred" });
        }
      },
    };
  });
  return tools;
}
