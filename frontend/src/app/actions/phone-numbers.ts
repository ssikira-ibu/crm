"use server";

import { serverApi } from "@/lib/api-server";
import type { PhoneNumberCreate, PhoneNumberUpdate } from "@/lib/types";

export async function listPhoneNumbers(
  customerId: string,
  contactId: string,
) {
  return serverApi.phoneNumbers.list(customerId, contactId);
}

export async function getPhoneNumber(
  customerId: string,
  contactId: string,
  phoneNumberId: string,
) {
  return serverApi.phoneNumbers.get(customerId, contactId, phoneNumberId);
}

export async function createPhoneNumber(
  customerId: string,
  contactId: string,
  input: PhoneNumberCreate,
) {
  return serverApi.phoneNumbers.create(customerId, contactId, input);
}

export async function updatePhoneNumber(
  customerId: string,
  contactId: string,
  phoneNumberId: string,
  input: PhoneNumberUpdate,
) {
  return serverApi.phoneNumbers.update(
    customerId,
    contactId,
    phoneNumberId,
    input,
  );
}

export async function removePhoneNumber(
  customerId: string,
  contactId: string,
  phoneNumberId: string,
) {
  return serverApi.phoneNumbers.remove(customerId, contactId, phoneNumberId);
}
