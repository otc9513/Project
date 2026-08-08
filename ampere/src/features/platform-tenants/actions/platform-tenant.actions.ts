"use server";

import { revalidatePath } from "next/cache";
import { platformTenantService } from "../service/platform-tenant.service";
import type {
  ListTenantsInput,
  SuspendTenantInput,
  ActivateTenantInput,
  CancelTenantInput,
  ExtendSubscriptionInput,
  ChangeTenantPlanInput,
  SetFeatureOverrideInput,
} from "../schema/platform-tenant.schema";

export async function platformOverviewAction() {
  return platformTenantService.overview();
}

export async function listPlatformTenantsAction(input: ListTenantsInput) {
  return platformTenantService.list(input);
}

export async function getPlatformTenantAction(tenantId: string) {
  return platformTenantService.getById(tenantId);
}

export async function suspendTenantAction(input: SuspendTenantInput) {
  const tenant = await platformTenantService.suspend(input);
  revalidatePath("/super-admin/tenants");
  revalidatePath(`/super-admin/tenants/${input.tenantId}`);
  return tenant;
}

export async function activateTenantAction(input: ActivateTenantInput) {
  const tenant = await platformTenantService.activate(input);
  revalidatePath("/super-admin/tenants");
  revalidatePath(`/super-admin/tenants/${input.tenantId}`);
  return tenant;
}

export async function cancelTenantAction(input: CancelTenantInput) {
  const tenant = await platformTenantService.cancel(input);
  revalidatePath("/super-admin/tenants");
  revalidatePath(`/super-admin/tenants/${input.tenantId}`);
  return tenant;
}

export async function deleteTenantAction(tenantId: string) {
  await platformTenantService.delete(tenantId);
  revalidatePath("/super-admin/tenants");
}

export async function extendTenantSubscriptionAction(input: ExtendSubscriptionInput) {
  const tenant = await platformTenantService.extendSubscription(input);
  revalidatePath(`/super-admin/tenants/${input.tenantId}`);
  return tenant;
}

export async function changeTenantPlanAction(input: ChangeTenantPlanInput) {
  const tenant = await platformTenantService.changePlan(input);
  revalidatePath(`/super-admin/tenants/${input.tenantId}`);
  return tenant;
}

export async function setTenantFeatureOverrideAction(input: SetFeatureOverrideInput) {
  const tenant = await platformTenantService.setFeatureOverride(input);
  revalidatePath(`/super-admin/tenants/${input.tenantId}`);
  return tenant;
}
