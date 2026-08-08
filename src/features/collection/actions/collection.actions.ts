"use server";

import { revalidatePath } from "next/cache";
import { collectionService } from "../service/collection.service";
import type {
  RecordPaymentInput,
  UnpaidSubscribersFilterInput,
} from "../schema/collection.schema";

export async function listUnpaidSubscribersAction(
  filter: Partial<UnpaidSubscribersFilterInput>
) {
  return collectionService.listUnpaidSubscribers(filter);
}

export async function getSubscriberBalanceAction(subscriberId: string) {
  return collectionService.subscriberBalance(subscriberId);
}

export async function getPaymentHistoryAction(subscriberId: string) {
  return collectionService.paymentHistory(subscriberId);
}

export async function recordPaymentAction(input: RecordPaymentInput) {
  const payment = await collectionService.recordPayment(input);
  revalidatePath("/app/collection");
  revalidatePath("/app/billing");
  return payment;
}
