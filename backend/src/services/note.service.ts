import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCustomerOwnership } from "./customer.service.js";
import type { CreateNoteInput, UpdateNoteInput } from "@crm/shared";

export async function listNotes(userId: string, customerId: string) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.note.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNote(
  userId: string,
  customerId: string,
  noteId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, customerId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  return note;
}

export async function createNote(
  userId: string,
  customerId: string,
  data: CreateNoteInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  return prisma.note.create({
    data: { ...data, customerId },
  });
}

export async function updateNote(
  userId: string,
  customerId: string,
  noteId: string,
  data: UpdateNoteInput,
) {
  await ensureCustomerOwnership(userId, customerId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, customerId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  return prisma.note.update({ where: { id: noteId }, data });
}

export async function deleteNote(
  userId: string,
  customerId: string,
  noteId: string,
) {
  await ensureCustomerOwnership(userId, customerId);
  const note = await prisma.note.findFirst({
    where: { id: noteId, customerId },
  });
  if (!note) {
    throw new AppError(404, "NOTE_NOT_FOUND", "Note not found");
  }
  await prisma.note.delete({ where: { id: noteId } });
}
