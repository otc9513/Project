"use server";

import { revalidatePath } from "next/cache";
import { platformBillingService } from "../service/platform-billing.service";
import type {
  GenerateSaasInvoiceInput,
  RecordSaasPaymentInput,
  CancelSaasInvoiceInput,
  ListSaasInvoicesInput,
} from "../schema/platform-billing.schema";

export async function listSaasInvoicesAction(input: ListSaasInvoicesInput) {
  return platformBillingService.list(input);
}

export async function getSaasInvoiceAction(id: string) {
  return platformBillingService.getById(id);
}

export async function generateSaasInvoiceAction(input: GenerateSaasInvoiceInput) {
  const invoice = await platformBillingService.generateInvoice(input);
  revalidatePath("/super-admin/billing");
  return invoice;
}

export async function recordSaasPaymentAction(input: RecordSaasPaymentInput) {
  const payment = await platformBillingService.recordPayment(input);
  revalidatePath("/super-admin/billing");
  return payment;
}

export async function cancelSaasInvoiceAction(input: CancelSaasInvoiceInput) {
  const invoice = await platformBillingService.cancelInvoice(input);
  revalidatePath("/super-admin/billing");
  return invoice;
}
