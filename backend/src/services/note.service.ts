import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerAccess } from "./customer.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, CreateNoteInput, UpdateNoteInput } from "@crm/shared";

export async function listNotes(ctx: OrgContext, customerId: string) {
  await ensureCustomerAccess(ctx, customerId);
  return prisma.note.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNote(
  ctx: OrgContext,
  customerId: string,
  noteId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, customerId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  return note;
}

export async function createNote(
  ctx: OrgContext,
  customerId: string,
  data: CreateNoteInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const note = await prisma.note.create({
    data: { ...data, customerId },
  });
  await recordEvent({
    ctx, customerId, entityType: "NOTE", entityId: note.id,
    action: "CREATED",
    metadata: { title: note.title },
  });
  return note;
}

export async function updateNote(
  ctx: OrgContext,
  customerId: string,
  noteId: string,
  data: UpdateNoteInput,
) {
  await ensureCustomerAccess(ctx, customerId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, customerId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  return prisma.note.update({ where: { id: noteId }, data });
}

export async function deleteNote(
  ctx: OrgContext,
  customerId: string,
  noteId: string,
) {
  await ensureCustomerAccess(ctx, customerId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, customerId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  await prisma.note.delete({ where: { id: noteId } });
}
