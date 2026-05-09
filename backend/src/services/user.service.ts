import { prisma } from "../lib/prisma.js";

export async function upsertUser(id: string, email: string, displayName?: string) {
  await prisma.user.upsert({
    where: { id },
    create: { id, email, displayName: displayName ?? null },
    update: { email, ...(displayName !== undefined ? { displayName } : {}) },
  });
}
