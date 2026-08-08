"use server";

import { revalidatePath } from "next/cache";
import { billingService } from "../service/billing.service";
import type {
  GenerateMonthlyInvoicesInput,
  GenerateIndividualInvoiceInput,
  InvoiceFilterInput,
  CancelInvoiceInput,
} from "../schema/billing.schema";

export async function generateMonthlyInvoicesAction(input: GenerateMonthlyInvoicesInput) {
  const result = await billingService.generateMonthly(input);
  revalidatePath("/app/billing");
  return result;
}

export async function generateIndividualInvoiceAction(input: GenerateIndividualInvoiceInput) {
  const invoice = await billingService.generateIndividual(input);
  revalidatePath("/app/billing");
  revalidatePath(`/app/subscribers/${input.subscriberId}`);
  return invoice;
}

export async function listInvoicesAction(filter: Partial<InvoiceFilterInput>) {
  return billingService.list(filter);
}

export async function cancelInvoiceAction(input: CancelInvoiceInput) {
  await billingService.cancel(input);
  revalidatePath("/app/billing");
}
