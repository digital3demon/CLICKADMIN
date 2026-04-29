import "server-only";

import { getDbClients } from "@/lib/get-db-clients";

export async function getClientsPrisma() {
  return (await getDbClients()).clients;
}

export async function getOrdersPrisma() {
  return (await getDbClients()).orders;
}

export async function getPricingPrisma() {
  return (await getDbClients()).pricing;
}

export async function getWarehousePrisma() {
  return (await getDbClients()).warehouse;
}

