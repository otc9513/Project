"use server";

import { revalidatePath } from "next/cache";
import { maintenanceService } from "../service/maintenance.service";
import type {
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceFilterInput,
} from "../schema/maintenance.schema";

export async function listMaintenanceAction(input: Partial<MaintenanceFilterInput> = {}) {
  return maintenanceService.list(input);
}

export async function createMaintenanceAction(input: CreateMaintenanceInput) {
  const record = await maintenanceService.create(input);
  revalidatePath("/app/maintenance");
  return record;
}

export async function updateMaintenanceAction(input: UpdateMaintenanceInput) {
  const record = await maintenanceService.update(input);
  revalidatePath("/app/maintenance");
  return record;
}

export async function upcomingMaintenanceAction(days?: number) {
  return maintenanceService.upcoming(days);
}
