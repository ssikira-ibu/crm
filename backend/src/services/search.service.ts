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

  const custOwnerFilter = ctx.role === "SALESPERSON"
    ? Prisma.sql`AND cust.owner_id = ${ctx.userId}`
    : Prisma.empty;

  const results = await prisma.$queryRaw<SearchResultItem[]>`
    SELECT * FROM (
      SELECT
        c.id,
        'customer' AS type,
        c.company_name AS title,
        c.industry AS subtitle,
        c.id AS "customerId",
        c.company_name AS "customerName",
        GREATEST(
          COALESCE(similarity(c.company_name, ${q}), 0),
          COALESCE(similarity(c.industry, ${q}), 0)
        ) AS similarity
      FROM customers c
      WHERE c.organization_id = ${ctx.organizationId}::uuid
        ${ownerFilter}
        AND (c.company_name % ${q} OR c.industry % ${q})

      UNION ALL

      SELECT
        ct.id,
        'contact' AS type,
        ct.first_name || ' ' || ct.last_name AS title,
        ct.email AS subtitle,
        ct.customer_id AS "customerId",
        cust.company_name AS "customerName",
        GREATEST(
          COALESCE(similarity(ct.first_name, ${q}), 0),
          COALESCE(similarity(ct.last_name, ${q}), 0),
          COALESCE(similarity(ct.email, ${q}), 0),
          COALESCE(similarity(ct.first_name || ' ' || ct.last_name, ${q}), 0)
        ) AS similarity
      FROM contacts ct
      JOIN customers cust ON cust.id = ct.customer_id
      WHERE cust.organization_id = ${ctx.organizationId}::uuid
        ${custOwnerFilter}
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
        d.status || ' · $' || d.value::text AS subtitle,
        d.customer_id AS "customerId",
        cust.company_name AS "customerName",
        similarity(d.title, ${q}) AS similarity
      FROM deals d
      JOIN customers cust ON cust.id = d.customer_id
      WHERE cust.organization_id = ${ctx.organizationId}::uuid
        ${custOwnerFilter}
        AND d.title % ${q}

      UNION ALL

      SELECT
        n.id,
        'note' AS type,
        n.title,
        LEFT(n.body, 100) AS subtitle,
        n.customer_id AS "customerId",
        cust.company_name AS "customerName",
        GREATEST(
          similarity(n.title, ${q}),
          similarity(n.body, ${q})
        ) AS similarity
      FROM notes n
      JOIN customers cust ON cust.id = n.customer_id
      WHERE cust.organization_id = ${ctx.organizationId}::uuid
        ${custOwnerFilter}
        AND (n.title % ${q} OR n.body % ${q})

      UNION ALL

      SELECT
        a.id,
        'activity' AS type,
        a.title,
        a.type || ' · ' || to_char(a.date, 'YYYY-MM-DD') AS subtitle,
        a.customer_id AS "customerId",
        cust.company_name AS "customerName",
        similarity(a.title, ${q}) AS similarity
      FROM activities a
      JOIN customers cust ON cust.id = a.customer_id
      WHERE cust.organization_id = ${ctx.organizationId}::uuid
        ${custOwnerFilter}
        AND a.title % ${q}

      UNION ALL

      SELECT
        r.id,
        'reminder' AS type,
        r.title,
        'Due ' || to_char(r.due_date, 'YYYY-MM-DD') AS subtitle,
        r.customer_id AS "customerId",
        cust.company_name AS "customerName",
        similarity(r.title, ${q}) AS similarity
      FROM reminders r
      JOIN customers cust ON cust.id = r.customer_id
      WHERE cust.organization_id = ${ctx.organizationId}::uuid
        ${custOwnerFilter}
        AND r.title % ${q}
    ) AS combined
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  return { query: q, results };
}
