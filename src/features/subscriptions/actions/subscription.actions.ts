"use server";

import { revalidatePath } from "next/cache";
import { amperePlanService, subscriptionService } from "../service/subscription.service";
import type {
  CreateAmperePlanInput,
  CreateSubscriptionInput,
  ChangeSubscriptionInput,
} from "../schema/subscription.schema";

export async function createAmperePlanAction(input: CreateAmperePlanInput) {
  const plan = await amperePlanService.create(input);
  revalidatePath("/app/settings/ampere-plans");
  return plan;
}

export async function createSubscriptionAction(input: CreateSubscriptionInput) {
  const subscription = await subscriptionService.create(input);
  revalidatePath(`/app/subscribers/${input.subscriberId}`);
  return subscription;
}

export async function changeSubscriptionAction(input: ChangeSubscriptionInput) {
  const subscription = await subscriptionService.change(input);
  revalidatePath(`/app/subscriptions/${input.subscriptionId}`);
  return subscription;
}
