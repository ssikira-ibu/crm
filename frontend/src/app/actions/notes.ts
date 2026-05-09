"use server";

import { serverApi } from "@/lib/api-server";
import type { NoteCreate, NoteUpdate } from "@/lib/types";

export async function listNotes(companyId: string) {
  return serverApi.notes.list(companyId);
}

export async function getNote(companyId: string, noteId: string) {
  return serverApi.notes.get(companyId, noteId);
}

export async function createNote(companyId: string, input: NoteCreate) {
  return serverApi.notes.create(companyId, input);
}

export async function updateNote(
  companyId: string,
  noteId: string,
  input: NoteUpdate,
) {
  return serverApi.notes.update(companyId, noteId, input);
}

export async function removeNote(companyId: string, noteId: string) {
  return serverApi.notes.remove(companyId, noteId);
}
