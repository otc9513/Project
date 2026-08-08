"use server";

import { revalidatePath } from "next/cache";
import { fuelService } from "../service/fuel.service";
import type {
  CreateFuelPurchaseInput,
  CreateFuelUsageInput,
  FuelFilterInput,
} from "../schema/fuel.schema";

export async function listFuelPurchasesAction(input: Partial<FuelFilterInput> = {}) {
  return fuelService.listPurchases(input);
}

export async function listFuelUsageAction(input: Partial<FuelFilterInput> = {}) {
  return fuelService.listUsage(input);
}

export async function recordFuelPurchaseAction(input: CreateFuelPurchaseInput) {
  const purchase = await fuelService.recordPurchase(input);
  revalidatePath("/app/fuel");
  return purchase;
}

export async function recordFuelUsageAction(input: CreateFuelUsageInput) {
  const usage = await fuelService.recordUsage(input);
  revalidatePath("/app/fuel");
  return usage;
}
