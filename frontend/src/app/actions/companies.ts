"use server";

import { serverApi } from "@/lib/api-server";
import type {
  CompanyCreate,
  CompanyListParams,
  CompanyUpdate,
} from "@/lib/types";

export async function listCompanies(params?: CompanyListParams) {
  return serverApi.companies.list(params);
}

export async function getCompany(id: string) {
  return serverApi.companies.get(id);
}

export async function createCompany(input: CompanyCreate) {
  return serverApi.companies.create(input);
}

export async function updateCompany(id: string, input: CompanyUpdate) {
  return serverApi.companies.update(id, input);
}

export async function removeCompany(id: string) {
  return serverApi.companies.remove(id);
}
