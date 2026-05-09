import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import type { OrgContext, SearchQueryParams, SearchResultItem } from "@crm/shared";

export async function search(
  ctx: OrgContext,
  params: SearchQueryParams,
): Promise<{ query: string; results: SearchResultItem[] }> {
  const { q, limit } = params;

  const ownerFilter = ctx.role === "SALESPERSON"
    ? Prisma.sql`AND c.owner_id = ${ctx.userId}`
    : Prisma.empty;

  const compOwnerFilter = ctx.role === "SALESPERSON"
    ? Prisma.sql`AND comp.owner_id = ${ctx.userId}`
    : Prisma.empty;

  const results = await prisma.$queryRaw<SearchResultItem[]>`
    SELECT * FROM (
      SELECT
        c.id,
        'company' AS type,
        c.name AS title,
        c.industry AS subtitle,
        c.id AS "companyId",
        c.name AS "companyName",
        GREATEST(
          COALESCE(similarity(c.name, ${q}), 0),
          COALESCE(similarity(c.industry, ${q}), 0)
        ) AS similarity
      FROM companies c
      WHERE c.organization_id = ${ctx.organizationId}::uuid
        ${ownerFilter}
        AND (c.name % ${q} OR c.industry % ${q})

      UNION ALL

      SELECT
        ct.id,
        'contact' AS type,
        ct.first_name || ' ' || ct.last_name AS title,
        ct.email AS subtitle,
        ct.company_id AS "companyId",
        comp.name AS "companyName",
        GREATEST(
          COALESCE(similarity(ct.first_name, ${q}), 0),
          COALESCE(similarity(ct.last_name, ${q}), 0),
          COALESCE(similarity(ct.email, ${q}), 0),
          COALESCE(similarity(ct.first_name || ' ' || ct.last_name, ${q}), 0)
        ) AS similarity
      FROM contacts ct
      JOIN companies comp ON comp.id = ct.company_id
      WHERE comp.organization_id = ${ctx.organizationId}::uuid
        ${compOwnerFilter}
        AND (
          ct.first_name % ${q}
          OR ct.last_name % ${q}
          OR ct.email % ${q}
          OR (ct.first_name || ' ' || ct.last_name) % ${q}
        )

      UNION ALL

      SELECT
        d.id,
        'deal' AS type,
        d.title,
        '$' || d.value::text AS subtitle,
        d.company_id AS "companyId",
        comp.name AS "companyName",
        similarity(d.title, ${q}) AS similarity
      FROM deals d
      JOIN companies comp ON comp.id = d.company_id
      WHERE comp.organization_id = ${ctx.organizationId}::uuid
        ${compOwnerFilter}
        AND d.title % ${q}

      UNION ALL

      SELECT
        n.id,
        'note' AS type,
        n.title,
        LEFT(n.body, 100) AS subtitle,
        n.company_id AS "companyId",
        comp.name AS "companyName",
        GREATEST(
          similarity(n.title, ${q}),
          similarity(n.body, ${q})
        ) AS similarity
      FROM notes n
      JOIN companies comp ON comp.id = n.company_id
      WHERE comp.organization_id = ${ctx.organizationId}::uuid
        ${compOwnerFilter}
        AND (n.title % ${q} OR n.body % ${q})

      UNION ALL

      SELECT
        a.id,
        'activity' AS type,
        a.title,
        a.type || ' · ' || to_char(a.date, 'YYYY-MM-DD') AS subtitle,
        a.company_id AS "companyId",
        comp.name AS "companyName",
        similarity(a.title, ${q}) AS similarity
      FROM activities a
      JOIN companies comp ON comp.id = a.company_id
      WHERE comp.organization_id = ${ctx.organizationId}::uuid
        ${compOwnerFilter}
        AND a.title % ${q}

      UNION ALL

      SELECT
        t.id,
        'task' AS type,
        t.title,
        'Due ' || to_char(t.due_date, 'YYYY-MM-DD') AS subtitle,
        t.company_id AS "companyId",
        comp.name AS "companyName",
        similarity(t.title, ${q}) AS similarity
      FROM tasks t
      LEFT JOIN companies comp ON comp.id = t.company_id
      WHERE t.organization_id = ${ctx.organizationId}::uuid
        AND (
          comp.id IS NULL
          OR (1=1 ${compOwnerFilter})
        )
        AND t.title % ${q}
    ) AS combined
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  return { query: q, results };
}
