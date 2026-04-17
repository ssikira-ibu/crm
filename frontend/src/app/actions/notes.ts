"use server";

import { serverApi } from "@/lib/api-server";
import type { NoteCreate, NoteUpdate } from "@/lib/types";

export async function listNotes(customerId: string) {
  return serverApi.notes.list(customerId);
}

export async function getNote(customerId: string, noteId: string) {
  return serverApi.notes.get(customerId, noteId);
}

export async function createNote(customerId: string, input: NoteCreate) {
  return serverApi.notes.create(customerId, input);
}

export async function updateNote(
  customerId: string,
  noteId: string,
  input: NoteUpdate,
) {
  return serverApi.notes.update(customerId, noteId, input);
}

export async function removeNote(customerId: string, noteId: string) {
  return serverApi.notes.remove(customerId, noteId);
}
