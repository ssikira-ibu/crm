import type { OrgContext } from "@crm/shared";

export function makeOrgContext(overrides?: Partial<OrgContext>): OrgContext {
  return {
    organizationId: "org-1",
    userId: "user-1",
    role: "ADMIN",
    ...overrides,
  };
}

export function makePrismaModel() {
  return {
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    count: () => Promise.resolve(0),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  };
}

export function makePrismaMock() {
  return {
    customer: makePrismaModel(),
    contact: makePrismaModel(),
    deal: makePrismaModel(),
    event: makePrismaModel(),
    note: makePrismaModel(),
    reminder: makePrismaModel(),
    activity: makePrismaModel(),
    address: makePrismaModel(),
    phoneNumber: makePrismaModel(),
    tag: makePrismaModel(),
    customerTag: makePrismaModel(),
    organizationMember: makePrismaModel(),
    organization: makePrismaModel(),
    invite: makePrismaModel(),
  };
}
