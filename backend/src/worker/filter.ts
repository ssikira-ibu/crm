import type { WorkflowFilter } from "@crm/shared";

function get(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export type EvalContext = {
  metadata: Record<string, unknown> | null;
  entity: Record<string, unknown> | null;
};

export function evaluateFilters(
  filters: WorkflowFilter[],
  ctx: EvalContext,
): boolean {
  for (const f of filters) {
    if (!evaluateFilter(f, ctx)) return false;
  }
  return true;
}

function evaluateFilter(f: WorkflowFilter, ctx: EvalContext): boolean {
  const lhs = get(ctx, f.path);
  const rhs = f.value;

  switch (f.op) {
    case "exists":
      return lhs !== undefined && lhs !== null;
    case "eq":
      return lhs === rhs;
    case "ne":
      return lhs !== rhs;
    case "in":
      return Array.isArray(rhs) && rhs.includes(lhs as never);
    case "gt":
      return typeof lhs === "number" && typeof rhs === "number" && lhs > rhs;
    case "lt":
      return typeof lhs === "number" && typeof rhs === "number" && lhs < rhs;
    case "gte":
      return typeof lhs === "number" && typeof rhs === "number" && lhs >= rhs;
    case "lte":
      return typeof lhs === "number" && typeof rhs === "number" && lhs <= rhs;
    default:
      return false;
  }
}
