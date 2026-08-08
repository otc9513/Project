"use server";

import { revalidatePath } from "next/cache";
import { platformAnnouncementService } from "../service/platform-announcement.service";
import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../schema/platform-announcement.schema";

export async function listPlatformAnnouncementsAction() {
  return platformAnnouncementService.list();
}

export async function createPlatformAnnouncementAction(input: CreateAnnouncementInput) {
  const announcement = await platformAnnouncementService.create(input);
  revalidatePath("/super-admin/announcements");
  return announcement;
}

export async function updatePlatformAnnouncementAction(input: UpdateAnnouncementInput) {
  const announcement = await platformAnnouncementService.update(input);
  revalidatePath("/super-admin/announcements");
  return announcement;
}

export async function deletePlatformAnnouncementAction(id: string) {
  await platformAnnouncementService.delete(id);
  revalidatePath("/super-admin/announcements");
}

export async function listVisibleAnnouncementsForTenantAction() {
  return platformAnnouncementService.listVisibleForCurrentTenant();
}
