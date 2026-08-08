"use server";

import { revalidatePath } from "next/cache";
import { platformNotificationService } from "../service/platform-notification.service";
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
} from "../schema/platform-notification.schema";

export async function listPlatformCampaignsAction() {
  return platformNotificationService.list();
}

export async function createPlatformCampaignAction(input: CreateCampaignInput) {
  const campaign = await platformNotificationService.create(input);
  revalidatePath("/super-admin/notifications");
  return campaign;
}

export async function updatePlatformCampaignAction(input: UpdateCampaignInput) {
  const campaign = await platformNotificationService.update(input);
  revalidatePath("/super-admin/notifications");
  return campaign;
}

export async function deletePlatformCampaignAction(id: string) {
  await platformNotificationService.delete(id);
  revalidatePath("/super-admin/notifications");
}

export async function sendPlatformCampaignAction(id: string) {
  const campaign = await platformNotificationService.send(id);
  revalidatePath("/super-admin/notifications");
  return campaign;
}
