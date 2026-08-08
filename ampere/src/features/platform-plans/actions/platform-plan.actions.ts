"use server";

import { revalidatePath } from "next/cache";
import { platformPlanService } from "../service/platform-plan.service";
import type { CreatePlanInput, UpdatePlanInput } from "../schema/platform-plan.schema";

export async function listPlatformPlansAction() {
  return platformPlanService.list();
}

export async function createPlatformPlanAction(input: CreatePlanInput) {
  const plan = await platformPlanService.create(input);
  revalidatePath("/super-admin/plans");
  return plan;
}

export async function updatePlatformPlanAction(input: UpdatePlanInput) {
  const plan = await platformPlanService.update(input);
  revalidatePath("/super-admin/plans");
  return plan;
}

export async function deactivatePlatformPlanAction(id: string) {
  await platformPlanService.deactivate(id);
  revalidatePath("/super-admin/plans");
}
