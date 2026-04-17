"use server";

import { serverApi } from "@/lib/api-server";
import type { ContactCreate, ContactUpdate } from "@/lib/types";

export async function listContacts(customerId: string) {
  return serverApi.contacts.list(customerId);
}

export async function getContact(customerId: string, contactId: string) {
  return serverApi.contacts.get(customerId, contactId);
}

export async function createContact(
  customerId: string,
  input: ContactCreate,
) {
  return serverApi.contacts.create(customerId, input);
}

export async function updateContact(
  customerId: string,
  contactId: string,
  input: ContactUpdate,
) {
  return serverApi.contacts.update(customerId, contactId, input);
}

export async function removeContact(customerId: string, contactId: string) {
  return serverApi.contacts.remove(customerId, contactId);
}
