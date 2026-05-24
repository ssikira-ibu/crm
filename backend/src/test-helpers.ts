import type { OrgContext } from "@crm/shared";

export function makeOrgContext(overrides?: Partial<OrgContext>): OrgContext {
  return {
    organizationId: "org-1",
    userId: "user-1",
    role: "ADMIN",
    actor: { type: "user" },
    ...overrides,
  };
}

export function makePrismaModel() {
  return {
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    findUnique: () => Promise.resolve(null),
    count: () => Promise.resolve(0),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    updateMany: () => Promise.resolve({ count: 0 }),
    upsert: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    deleteMany: () => Promise.resolve({ count: 0 }),
    groupBy: () => Promise.resolve([]),
    aggregate: () => Promise.resolve({ _sum: {}, _count: 0 }),
  };
}

export function makePrismaMock() {
  return {
    company: makePrismaModel(),
    contact: makePrismaModel(),
    deal: makePrismaModel(),
    event: makePrismaModel(),
    note: makePrismaModel(),
    task: makePrismaModel(),
    activity: makePrismaModel(),
    address: makePrismaModel(),
    phoneNumber: makePrismaModel(),
    tag: makePrismaModel(),
    companyTag: makePrismaModel(),
    pipeline: makePrismaModel(),
    pipelineStage: makePrismaModel(),
    customFieldDefinition: makePrismaModel(),
    customFieldValue: makePrismaModel(),
    user: makePrismaModel(),
    organizationMember: makePrismaModel(),
    organization: makePrismaModel(),
    invite: makePrismaModel(),
    $queryRaw: () => Promise.resolve([]),
    $transaction: (arr: any[]) => Promise.all(arr),
  };
}
