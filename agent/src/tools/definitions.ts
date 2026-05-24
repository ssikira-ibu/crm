import { z } from "zod";
import type { BackendClient } from "../lib/backend-client.js";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodType;
  execute: (params: Record<string, unknown>, client: BackendClient) => Promise<unknown>;
}

export const toolDefinitions: ToolDefinition[] = [
  // --- Read / Search ---
  {
    name: "search",
    description:
      "Search across companies, contacts, deals, notes, activities, and tasks by keyword. Use this first to find entities before acting on them. Returns matched items with type, title, and companyId.",
    parameters: z.object({
      q: z.string().describe("Search query"),
      limit: z.number().int().min(1).max(20).optional().describe("Max results (default 5)"),
    }),
    execute: (params, client) => client.search(params.q as string, params.limit as number | undefined),
  },
  {
    name: "get_dashboard",
    description:
      "Get a summary of the user's CRM: open tasks, recent notes, recent activities, deals, and company status counts. Good for 'what needs my attention' queries.",
    parameters: z.object({}),
    execute: (_params, client) => client.getDashboard(),
  },
  {
    name: "list_companies",
    description:
      "List companies with optional filters. Use status filter (LEAD, PROSPECT, ACTIVE, INACTIVE) or search by name.",
    parameters: z.object({
      page: z.number().int().positive().optional().describe("Page number"),
      limit: z.number().int().min(1).max(50).optional().describe("Items per page (default 20)"),
      status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE"]).optional().describe("Filter by company status"),
      search: z.string().optional().describe("Search by company name"),
    }),
    execute: (params, client) => client.listCompanies(params as Record<string, string | number>),
  },
  {
    name: "get_company",
    description:
      "Get full details of a company including its contacts, deals, activities, notes, tasks, and tags. Requires companyId.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
    }),
    execute: (params, client) => client.getCompany(params.companyId as string),
  },
  {
    name: "get_deals_overview",
    description:
      "Get pipeline metrics: total pipeline value, weighted forecast, win rate, won this month/last month, and per-stage value breakdown. Use for pipeline health questions.",
    parameters: z.object({}),
    execute: (_params, client) => client.getDealsOverview(),
  },
  {
    name: "get_deal_detail",
    description:
      "Get full details of a deal including its stage, pipeline, company, contact, owner, activities, notes, and tasks.",
    parameters: z.object({
      dealId: z.string().describe("Deal UUID"),
    }),
    execute: (params, client) => client.getDealDetail(params.dealId as string),
  },
  {
    name: "list_tasks",
    description:
      "List tasks across all companies with optional filters. Use to find overdue, high-priority, or assigned tasks.",
    parameters: z.object({
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional().describe("Filter by task status"),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().describe("Filter by priority"),
      assigneeId: z.string().optional().describe("Filter by assignee user ID"),
      dueBefore: z.string().optional().describe("Filter tasks due before this ISO date"),
      limit: z.number().int().min(1).max(50).optional().describe("Items per page (default 20)"),
    }),
    execute: (params, client) => client.listTasks(params as Record<string, string | number>),
  },
  {
    name: "list_events",
    description:
      "List recent audit events (changes made in the CRM). Shows what was created, updated, deleted, and by whom.",
    parameters: z.object({
      limit: z.number().int().min(1).max(50).optional().describe("Max events (default 50)"),
      cursor: z.string().optional().describe("Pagination cursor (sequence number)"),
    }),
    execute: (params, client) => client.listEvents(params as Record<string, string | number>),
  },
  {
    name: "list_contacts",
    description: "List all contacts for a specific company.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
    }),
    execute: (params, client) => client.listContacts(params.companyId as string),
  },
  {
    name: "list_pipelines",
    description: "List all pipelines and their stages. Use to get stage IDs when creating or updating deals.",
    parameters: z.object({}),
    execute: (_params, client) => client.listPipelines(),
  },

  // --- Create ---
  {
    name: "create_activity",
    description:
      "Log an activity (CALL, EMAIL, MEETING, or OTHER) for a company. Optionally link to a contact and/or deal.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      type: z.enum(["CALL", "EMAIL", "MEETING", "OTHER"]).describe("Activity type"),
      title: z.string().describe("Short title, e.g. 'Intro call with John'"),
      description: z.string().optional().describe("Detailed notes"),
      date: z.string().describe("ISO date string for when the activity occurred"),
      contactId: z.string().optional().describe("Contact UUID to link"),
      dealId: z.string().optional().describe("Deal UUID to link"),
    }),
    execute: (params, client) => {
      const { companyId, ...body } = params;
      return client.createActivity(companyId as string, body);
    },
  },
  {
    name: "create_task",
    description:
      "Create a task. Can be org-level or linked to a company. Set priority, due date, and assignee.",
    parameters: z.object({
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().describe("Priority (default NORMAL)"),
      dueDate: z.string().optional().describe("ISO date for when the task is due"),
      assigneeId: z.string().optional().describe("User ID to assign the task to"),
      companyId: z.string().optional().describe("Company UUID to scope the task to"),
      contactId: z.string().optional().describe("Contact UUID to link"),
      dealId: z.string().optional().describe("Deal UUID to link"),
    }),
    execute: (params, client) => {
      const { companyId, ...body } = params;
      if (companyId) {
        return client.createCompanyTask(companyId as string, body);
      }
      return client.createTask(body);
    },
  },
  {
    name: "create_note",
    description: "Create a note on a company. Optionally link to a contact and/or deal.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      title: z.string().describe("Note title"),
      body: z.string().describe("Note content"),
      contactId: z.string().optional().describe("Contact UUID to link"),
      dealId: z.string().optional().describe("Deal UUID to link"),
    }),
    execute: (params, client) => {
      const { companyId, ...body } = params;
      return client.createNote(companyId as string, body);
    },
  },
  {
    name: "create_company",
    description: "Create a new company in the CRM.",
    parameters: z.object({
      name: z.string().describe("Company name"),
      industry: z.string().optional().describe("Industry/sector"),
      website: z.string().optional().describe("Company website URL"),
      phone: z.string().optional().describe("Phone number"),
      email: z.string().optional().describe("Email address"),
      status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE"]).optional().describe("Status (default LEAD)"),
    }),
    execute: (params, client) => client.createCompany(params),
  },
  {
    name: "create_contact",
    description: "Create a new contact for a company.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      firstName: z.string().describe("First name"),
      lastName: z.string().describe("Last name"),
      email: z.string().optional().describe("Email address"),
      jobTitle: z.string().optional().describe("Job title"),
      isPrimary: z.boolean().optional().describe("Whether this is the primary contact"),
    }),
    execute: (params, client) => {
      const { companyId, ...body } = params;
      return client.createContact(companyId as string, body);
    },
  },
  {
    name: "create_deal",
    description:
      "Create a new deal for a company. Requires a stageId (use list_pipelines to find stage IDs).",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      title: z.string().describe("Deal title"),
      value: z.number().nonnegative().describe("Deal value in USD"),
      stageId: z.string().describe("Pipeline stage UUID"),
      description: z.string().optional().describe("Deal description"),
      expectedCloseDate: z.string().optional().describe("ISO date for expected close"),
      contactId: z.string().optional().describe("Contact UUID to link"),
      pipelineId: z.string().optional().describe("Pipeline UUID (uses default if omitted)"),
    }),
    execute: (params, client) => {
      const { companyId, ...body } = params;
      return client.createDeal(companyId as string, body);
    },
  },

  // --- Update ---
  {
    name: "update_deal",
    description:
      "Update a deal: change stage, value, title, description, expected close date, or linked contact.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      dealId: z.string().describe("Deal UUID"),
      title: z.string().optional().describe("New title"),
      value: z.number().nonnegative().optional().describe("New value in USD"),
      stageId: z.string().optional().describe("New stage UUID (moves deal to this stage)"),
      description: z.string().optional().describe("New description"),
      expectedCloseDate: z.string().optional().describe("New expected close date (ISO)"),
      contactId: z.string().nullable().optional().describe("New contact UUID or null to unlink"),
    }),
    execute: (params, client) => {
      const { companyId, dealId, ...body } = params;
      return client.updateDeal(companyId as string, dealId as string, body);
    },
  },
  {
    name: "update_task",
    description:
      "Update a task: change status, priority, title, due date, or assignee. Set status to DONE to complete.",
    parameters: z.object({
      taskId: z.string().describe("Task UUID"),
      companyId: z.string().optional().describe("Company UUID (required for company-scoped tasks)"),
      title: z.string().optional().describe("New title"),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional().describe("New status"),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().describe("New priority"),
      dueDate: z.string().nullable().optional().describe("New due date (ISO) or null to clear"),
      assigneeId: z.string().nullable().optional().describe("New assignee user ID or null to unassign"),
    }),
    execute: (params, client) => {
      const { taskId, companyId, ...body } = params;
      if (companyId) {
        return client.updateCompanyTask(companyId as string, taskId as string, body);
      }
      return client.updateTask(taskId as string, body);
    },
  },
  {
    name: "update_company",
    description: "Update a company's name, industry, website, phone, email, or status.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      name: z.string().optional().describe("New name"),
      industry: z.string().optional().describe("New industry"),
      website: z.string().optional().describe("New website URL"),
      phone: z.string().optional().describe("New phone number"),
      email: z.string().optional().describe("New email"),
      status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE"]).optional().describe("New status"),
    }),
    execute: (params, client) => {
      const { companyId, ...body } = params;
      return client.updateCompany(companyId as string, body);
    },
  },

  // --- Tags ---
  {
    name: "list_tags",
    description: "List all tags in the organization.",
    parameters: z.object({}),
    execute: (_params, client) => client.listTags(),
  },
  {
    name: "add_tag_to_company",
    description: "Add a tag to a company.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      tagId: z.string().describe("Tag UUID"),
    }),
    execute: (params, client) => client.addTagToCompany(params.companyId as string, params.tagId as string),
  },
  {
    name: "remove_tag_from_company",
    description: "Remove a tag from a company.",
    parameters: z.object({
      companyId: z.string().describe("Company UUID"),
      tagId: z.string().describe("Tag UUID"),
    }),
    execute: (params, client) => client.removeTagFromCompany(params.companyId as string, params.tagId as string),
  },

  // --- Workflows (automation rules) ---
  {
    name: "list_workflows",
    description:
      "List the user's automation workflows (trigger -> action rules). Use to show, audit, or find a workflow before deleting it.",
    parameters: z.object({
      enabled: z.boolean().optional().describe("Only return enabled workflows"),
    }),
    execute: (params, client) =>
      client.listWorkflows(params as { enabled?: boolean }),
  },
  {
    name: "create_workflow",
    description: [
      "Create an automation workflow that fires when a CRM event matches the trigger.",
      "Triggers: entityType is one of DEAL|COMPANY|CONTACT|TASK|ACTIVITY|NOTE|TAG.",
      "Actions: one of CREATED|UPDATED|DELETED|STATUS_CHANGED|STAGE_CHANGED|COMPLETED|TAGGED|UNTAGGED|CLOSED_WON|CLOSED_LOST|CLOSED.",
      "CLOSED_WON/CLOSED_LOST/CLOSED are synthetic and match a DEAL STAGE_CHANGED into a won/lost terminal stage.",
      "Filters compare paths against values. Supported paths: metadata.* (event metadata) and entity.* (resolved entity, e.g. entity.id, entity.value, entity.stage.isWon).",
      "Action types: notify (in-app notification to the workflow owner) or create_task (creates a task linked to the entity).",
      "Title/body/link support {{path}} interpolation against {metadata, entity, event}.",
      "Example: notify when a specific deal closes won --",
      '{ name: "Renewal close alert", trigger: { entityType: "DEAL", action: "CLOSED_WON", filters: [{ path: "entity.id", op: "eq", value: "<dealId>" }] }, action: { type: "notify", title: "Deal won: {{entity.title}}", link: "/companies/{{entity.companyId}}/deals/{{entity.id}}" } }',
    ].join(" "),
    parameters: z.object({
      name: z.string().describe("Human-readable workflow name"),
      enabled: z.boolean().optional().describe("Defaults to true"),
      trigger: z.object({
        entityType: z.enum(["DEAL", "COMPANY", "CONTACT", "TASK", "ACTIVITY", "NOTE", "TAG"]),
        action: z.enum([
          "CREATED", "UPDATED", "DELETED", "STATUS_CHANGED", "STAGE_CHANGED",
          "COMPLETED", "TAGGED", "UNTAGGED",
          "CLOSED_WON", "CLOSED_LOST", "CLOSED",
        ]),
        filters: z.array(z.object({
          path: z.string(),
          op: z.enum(["eq", "ne", "in", "gt", "lt", "gte", "lte", "exists"]),
          value: z.unknown().optional(),
        })).optional(),
      }),
      action: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("notify"),
          userId: z.string().optional(),
          title: z.string(),
          body: z.string().optional(),
          link: z.string().optional(),
        }),
        z.object({
          type: z.literal("create_task"),
          title: z.string(),
          description: z.string().optional(),
          dueInDays: z.number().int().min(0).max(365).optional(),
          assigneeId: z.string().optional(),
          linkToEntity: z.boolean().optional(),
        }),
      ]),
    }),
    execute: (params, client) => client.createWorkflow(params),
  },
  {
    name: "delete_workflow",
    description: "Soft-delete an automation workflow by ID.",
    parameters: z.object({
      workflowId: z.string().describe("Workflow UUID"),
    }),
    execute: (params, client) => client.deleteWorkflow(params.workflowId as string),
  },
];
