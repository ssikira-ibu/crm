import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Seed constants
// ---------------------------------------------------------------------------

const SEED_USER_ID = "seed-user-firebase-uid";
const SEED_USER_EMAIL = "seed@example.com";
const SEED_USER_NAME = "Seed User";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding database…");

  // 1. User
  const user = await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    create: { id: SEED_USER_ID, email: SEED_USER_EMAIL, displayName: SEED_USER_NAME },
    update: { email: SEED_USER_EMAIL, displayName: SEED_USER_NAME },
  });
  console.log(`  User: ${user.id}`);

  // 2. Organization
  const org = await prisma.organization.create({
    data: { name: "Acme Corp" },
  });
  console.log(`  Organization: ${org.id}`);

  // 3. OrganizationMember (link user → org as ADMIN)
  const member = await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: "ADMIN",
    },
  });
  console.log(`  OrganizationMember: ${member.id}`);

  // 4. Default Pipeline + Stages
  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: org.id,
      name: "Sales Pipeline",
      isDefault: true,
      position: 0,
    },
  });
  console.log(`  Pipeline: ${pipeline.id}`);

  const stageDefinitions = [
    { name: "Lead In", position: 0, probability: 10 },
    { name: "Qualified", position: 1, probability: 25 },
    { name: "Proposal", position: 2, probability: 50 },
    { name: "Negotiation", position: 3, probability: 75 },
    { name: "Won", position: 4, probability: 100, isWon: true },
    { name: "Lost", position: 5, probability: 0, isLost: true },
  ] as const;

  const stages: Record<string, { id: string }> = {};
  for (const def of stageDefinitions) {
    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: def.name,
        position: def.position,
        probability: def.probability,
        isWon: "isWon" in def ? def.isWon : false,
        isLost: "isLost" in def ? def.isLost : false,
      },
    });
    stages[def.name] = stage;
    console.log(`    Stage: ${stage.name} (${stage.id})`);
  }

  // 5. Tags
  const tagEnterprise = await prisma.tag.create({
    data: { organizationId: org.id, name: "Enterprise", color: "#3B82F6" },
  });
  const tagStartup = await prisma.tag.create({
    data: { organizationId: org.id, name: "Startup", color: "#10B981" },
  });
  const tagHighValue = await prisma.tag.create({
    data: { organizationId: org.id, name: "High Value", color: "#F59E0B" },
  });
  console.log(`  Tags: ${tagEnterprise.name}, ${tagStartup.name}, ${tagHighValue.name}`);

  // 6. Companies (was Customers)
  const company1 = await prisma.company.create({
    data: {
      organizationId: org.id,
      ownerId: user.id,
      name: "TechNova Solutions",
      industry: "Technology",
      website: "https://technova.example.com",
      phone: "+1-555-100-2000",
      email: "info@technova.example.com",
      status: "ACTIVE",
      tags: {
        create: [
          { tagId: tagEnterprise.id },
          { tagId: tagHighValue.id },
        ],
      },
    },
  });
  console.log(`  Company: ${company1.name}`);

  const company2 = await prisma.company.create({
    data: {
      organizationId: org.id,
      ownerId: user.id,
      name: "GreenLeaf Industries",
      industry: "Manufacturing",
      website: "https://greenleaf.example.com",
      phone: "+1-555-200-3000",
      email: "hello@greenleaf.example.com",
      status: "PROSPECT",
      tags: {
        create: [{ tagId: tagStartup.id }],
      },
    },
  });
  console.log(`  Company: ${company2.name}`);

  const company3 = await prisma.company.create({
    data: {
      organizationId: org.id,
      ownerId: user.id,
      name: "Pinnacle Consulting",
      industry: "Consulting",
      website: "https://pinnacle.example.com",
      phone: "+1-555-300-4000",
      email: "contact@pinnacle.example.com",
      status: "LEAD",
    },
  });
  console.log(`  Company: ${company3.name}`);

  // 7. Contacts
  const contact1 = await prisma.contact.create({
    data: {
      companyId: company1.id,
      ownerId: user.id,
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@technova.example.com",
      jobTitle: "VP of Engineering",
      isPrimary: true,
      phoneNumbers: {
        create: [
          { label: "WORK", number: "+1-555-100-2001", isPrimary: true },
          { label: "MOBILE", number: "+1-555-100-2002" },
        ],
      },
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      companyId: company1.id,
      firstName: "Bob",
      lastName: "Smith",
      email: "bob@technova.example.com",
      jobTitle: "CTO",
      phoneNumbers: {
        create: [
          { label: "WORK", number: "+1-555-100-3001", isPrimary: true },
        ],
      },
    },
  });

  const contact3 = await prisma.contact.create({
    data: {
      companyId: company2.id,
      ownerId: user.id,
      firstName: "Carol",
      lastName: "Williams",
      email: "carol@greenleaf.example.com",
      jobTitle: "Procurement Manager",
      isPrimary: true,
      phoneNumbers: {
        create: [
          { label: "WORK", number: "+1-555-200-3001", isPrimary: true },
        ],
      },
    },
  });

  const contact4 = await prisma.contact.create({
    data: {
      companyId: company3.id,
      firstName: "David",
      lastName: "Brown",
      email: "david@pinnacle.example.com",
      jobTitle: "Managing Partner",
      isPrimary: true,
      phoneNumbers: {
        create: [
          { label: "MOBILE", number: "+1-555-300-4001", isPrimary: true },
        ],
      },
    },
  });
  console.log(`  Contacts: ${contact1.firstName}, ${contact2.firstName}, ${contact3.firstName}, ${contact4.firstName}`);

  // 8. Addresses
  await prisma.address.create({
    data: {
      companyId: company1.id,
      label: "MAIN",
      street1: "123 Innovation Drive",
      street2: "Suite 400",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      country: "US",
    },
  });
  await prisma.address.create({
    data: {
      companyId: company2.id,
      label: "MAIN",
      street1: "456 Green Way",
      city: "Portland",
      state: "OR",
      zipCode: "97201",
      country: "US",
    },
  });
  await prisma.address.create({
    data: {
      companyId: company3.id,
      label: "MAIN",
      street1: "789 Summit Blvd",
      street2: "Floor 12",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      country: "US",
    },
  });
  console.log("  Addresses: 3 created");

  // 9. Deals (with pipeline/stage refs, no status field)
  const deal1 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      companyId: company1.id,
      contactId: contact1.id,
      ownerId: user.id,
      pipelineId: pipeline.id,
      stageId: stages["Proposal"].id,
      title: "TechNova Platform License",
      description: "Annual enterprise license for the full platform suite",
      value: 120000,
      expectedCloseDate: new Date("2026-07-15"),
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      companyId: company2.id,
      contactId: contact3.id,
      ownerId: user.id,
      pipelineId: pipeline.id,
      stageId: stages["Qualified"].id,
      title: "GreenLeaf Supply Chain Integration",
      description: "Integration of supply chain management module",
      value: 45000,
      expectedCloseDate: new Date("2026-08-30"),
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      companyId: company1.id,
      contactId: contact2.id,
      ownerId: user.id,
      pipelineId: pipeline.id,
      stageId: stages["Won"].id,
      title: "TechNova Support Contract",
      description: "24/7 premium support package",
      value: 36000,
      closedAt: new Date("2026-03-01"),
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      organizationId: org.id,
      companyId: company3.id,
      contactId: contact4.id,
      ownerId: user.id,
      pipelineId: pipeline.id,
      stageId: stages["Lead In"].id,
      title: "Pinnacle Advisory Retainer",
      description: "Monthly consulting retainer agreement",
      value: 15000,
      expectedCloseDate: new Date("2026-09-15"),
    },
  });
  console.log(`  Deals: ${deal1.title}, ${deal2.title}, ${deal3.title}, ${deal4.title}`);

  // 10. Activities
  await prisma.activity.create({
    data: {
      companyId: company1.id,
      contactId: contact1.id,
      dealId: deal1.id,
      type: "MEETING",
      title: "Platform demo with TechNova",
      description: "Presented full platform capabilities to the engineering team",
      date: new Date("2026-04-20"),
    },
  });
  await prisma.activity.create({
    data: {
      companyId: company1.id,
      contactId: contact2.id,
      type: "CALL",
      title: "Follow-up call with Bob",
      description: "Discussed technical requirements and integration timeline",
      date: new Date("2026-04-25"),
    },
  });
  await prisma.activity.create({
    data: {
      companyId: company2.id,
      contactId: contact3.id,
      dealId: deal2.id,
      type: "EMAIL",
      title: "Sent proposal to GreenLeaf",
      description: "Emailed supply chain integration proposal and pricing",
      date: new Date("2026-05-01"),
    },
  });
  await prisma.activity.create({
    data: {
      companyId: company3.id,
      contactId: contact4.id,
      type: "MEETING",
      title: "Intro meeting with Pinnacle",
      description: "Initial discovery meeting with managing partner",
      date: new Date("2026-05-05"),
    },
  });
  console.log("  Activities: 4 created");

  // 11. Notes
  await prisma.note.create({
    data: {
      companyId: company1.id,
      contactId: contact1.id,
      dealId: deal1.id,
      title: "Key requirements",
      body: "TechNova needs SSO integration and custom reporting. Alice is the primary decision-maker for the engineering budget.",
    },
  });
  await prisma.note.create({
    data: {
      companyId: company2.id,
      title: "Competitor intel",
      body: "GreenLeaf is currently evaluating two other vendors. Our differentiator is the real-time tracking module.",
    },
  });
  await prisma.note.create({
    data: {
      companyId: company3.id,
      contactId: contact4.id,
      title: "Budget timeline",
      body: "Pinnacle fiscal year starts in October. David mentioned they allocate consulting budgets in Q3.",
    },
  });
  console.log("  Notes: 3 created");

  // 12. Tasks (was Reminders)
  await prisma.task.create({
    data: {
      organizationId: org.id,
      companyId: company1.id,
      contactId: contact1.id,
      dealId: deal1.id,
      assigneeId: user.id,
      createdById: user.id,
      title: "Send revised proposal to Alice",
      description: "Update pricing based on feedback from the platform demo",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2026-05-15"),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      companyId: company2.id,
      contactId: contact3.id,
      dealId: deal2.id,
      assigneeId: user.id,
      createdById: user.id,
      title: "Schedule technical review with GreenLeaf",
      description: "Set up a call to walk through integration architecture",
      status: "IN_PROGRESS",
      priority: "NORMAL",
      dueDate: new Date("2026-05-20"),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      companyId: company3.id,
      assigneeId: user.id,
      createdById: user.id,
      title: "Research Pinnacle's recent projects",
      description: "Prepare background research before the next meeting",
      status: "DONE",
      priority: "LOW",
      dueDate: new Date("2026-05-04"),
      completedAt: new Date("2026-05-03"),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      assigneeId: user.id,
      createdById: user.id,
      title: "Update CRM pipeline stages",
      description: "Review and adjust pipeline stage probabilities based on Q1 data",
      status: "TODO",
      priority: "URGENT",
      dueDate: new Date("2026-05-12"),
    },
  });
  console.log("  Tasks: 4 created");

  // 13. Events (audit trail)
  await prisma.event.create({
    data: {
      organizationId: org.id,
      actorId: user.id,
      companyId: company1.id,
      entityType: "company",
      entityId: company1.id,
      action: "created",
      source: "user",
      metadata: { name: company1.name },
    },
  });
  await prisma.event.create({
    data: {
      organizationId: org.id,
      actorId: user.id,
      companyId: company1.id,
      entityType: "deal",
      entityId: deal1.id,
      action: "created",
      source: "user",
      metadata: { title: deal1.title, value: 120000 },
    },
  });
  await prisma.event.create({
    data: {
      organizationId: org.id,
      actorId: user.id,
      companyId: company1.id,
      entityType: "deal",
      entityId: deal3.id,
      action: "stage_changed",
      source: "user",
      metadata: { title: deal3.title, stage: "Won" },
    },
  });
  await prisma.event.create({
    data: {
      organizationId: org.id,
      actorId: user.id,
      companyId: company2.id,
      entityType: "company",
      entityId: company2.id,
      action: "created",
      source: "user",
      metadata: { name: company2.name },
    },
  });
  console.log("  Events: 4 created");

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
