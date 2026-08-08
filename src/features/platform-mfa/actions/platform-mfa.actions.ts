"use server";

import { revalidatePath } from "next/cache";
import { platformMfaService } from "../service/mfa.service";

export async function startMfaEnrollmentAction() {
  return platformMfaService.startEnrollment();
}

export async function confirmMfaEnrollmentAction(code: string) {
  const result = await platformMfaService.confirmEnrollment(code);
  revalidatePath("/super-admin/settings/security");
  return result;
}

export async function verifyMfaChallengeAction(code: string) {
  return platformMfaService.verifyChallenge(code);
}

export async function disableMfaAction(code: string) {
  const result = await platformMfaService.disable(code);
  revalidatePath("/super-admin/settings/security");
  return result;
}

export async function getMfaStatusAction() {
  return platformMfaService.getStatus();
}
