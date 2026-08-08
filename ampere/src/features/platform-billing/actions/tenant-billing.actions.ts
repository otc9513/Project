"use server";

import { revalidatePath } from "next/cache";
import { tenantBillingService } from "../service/tenant-billing.service";
import type { BillingCycle } from "@prisma/client";

export async function getMySubscriptionAction() {
  return tenantBillingService.getMySubscription();
}

export async function listMyInvoicesAction() {
  return tenantBillingService.listMyInvoices();
}

export async function renewMySubscriptionAction(billingCycle: BillingCycle) {
  const invoice = await tenantBillingService.renewNow(billingCycle);
  revalidatePath("/app/subscription");
  return invoice;
}
