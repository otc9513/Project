"use server";

import { revalidatePath } from "next/cache";
import { platformAdminService } from "../service/platform-admin.service";
import type {
  InviteAdminInput,
  RevokeAdminInput,
  CancelInviteInput,
} from "../schema/platform-admin.schema";

export async function listPlatformAdminsAction() {
  return platformAdminService.list();
}

export async function invitePlatformAdminAction(input: InviteAdminInput) {
  const invite = await platformAdminService.invite(input);
  revalidatePath("/super-admin/admins");
  return invite;
}

export async function cancelPlatformAdminInviteAction(input: CancelInviteInput) {
  await platformAdminService.cancelInvite(input);
  revalidatePath("/super-admin/admins");
}

export async function revokePlatformAdminAction(input: RevokeAdminInput) {
  await platformAdminService.revoke(input);
  revalidatePath("/super-admin/admins");
}
