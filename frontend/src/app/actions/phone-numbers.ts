"use server";

import { serverApi } from "@/lib/api-server";
import type { PhoneNumberCreate, PhoneNumberUpdate } from "@/lib/types";

export async function listPhoneNumbers(
  companyId: string,
  contactId: string,
) {
  return serverApi.phoneNumbers.list(companyId, contactId);
}

export async function getPhoneNumber(
  companyId: string,
  contactId: string,
  phoneNumberId: string,
) {
  return serverApi.phoneNumbers.get(companyId, contactId, phoneNumberId);
}

export async function createPhoneNumber(
  companyId: string,
  contactId: string,
  input: PhoneNumberCreate,
) {
  return serverApi.phoneNumbers.create(companyId, contactId, input);
}

export async function updatePhoneNumber(
  companyId: string,
  contactId: string,
  phoneNumberId: string,
  input: PhoneNumberUpdate,
) {
  return serverApi.phoneNumbers.update(
    companyId,
    contactId,
    phoneNumberId,
    input,
  );
}

export async function removePhoneNumber(
  companyId: string,
  contactId: string,
  phoneNumberId: string,
) {
  return serverApi.phoneNumbers.remove(companyId, contactId, phoneNumberId);
}
