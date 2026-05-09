"use server";

import { serverApi } from "@/lib/api-server";
import type { ContactCreate, ContactUpdate } from "@/lib/types";

export async function listContacts(companyId: string) {
  return serverApi.contacts.list(companyId);
}

export async function getContact(companyId: string, contactId: string) {
  return serverApi.contacts.get(companyId, contactId);
}

export async function createContact(
  companyId: string,
  input: ContactCreate,
) {
  return serverApi.contacts.create(companyId, input);
}

export async function updateContact(
  companyId: string,
  contactId: string,
  input: ContactUpdate,
) {
  return serverApi.contacts.update(companyId, contactId, input);
}

export async function removeContact(companyId: string, contactId: string) {
  return serverApi.contacts.remove(companyId, contactId);
}
