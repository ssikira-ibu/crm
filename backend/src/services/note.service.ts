import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCompanyAccess } from "./company.service.js";
import { recordEvent } from "./event.service.js";
import type { OrgContext, CreateNoteInput, UpdateNoteInput } from "@crm/shared";

export async function listNotes(ctx: OrgContext, companyId: string) {
  await ensureCompanyAccess(ctx, companyId);
  return prisma.note.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNote(
  ctx: OrgContext,
  companyId: string,
  noteId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, companyId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  return note;
}

export async function createNote(
  ctx: OrgContext,
  companyId: string,
  data: CreateNoteInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  const note = await prisma.note.create({
    data: { ...data, companyId },
  });
  await recordEvent({
    ctx, companyId, entityType: "NOTE", entityId: note.id,
    action: "CREATED",
    metadata: { title: note.title },
  });
  return note;
}

export async function updateNote(
  ctx: OrgContext,
  companyId: string,
  noteId: string,
  data: UpdateNoteInput,
) {
  await ensureCompanyAccess(ctx, companyId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, companyId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  return prisma.note.update({ where: { id: noteId }, data });
}

export async function deleteNote(
  ctx: OrgContext,
  companyId: string,
  noteId: string,
) {
  await ensureCompanyAccess(ctx, companyId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, companyId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  await prisma.note.delete({ where: { id: noteId } });
}
