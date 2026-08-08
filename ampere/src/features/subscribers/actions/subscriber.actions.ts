"use server";

import { revalidatePath } from "next/cache";
import { subscriberService } from "../service/subscriber.service";
import type {
  CreateSubscriberInput,
  UpdateSubscriberInput,
  SubscriberFilterInput,
} from "../schema/subscriber.schema";

export async function listSubscribersAction(filter: Partial<SubscriberFilterInput>) {
  return subscriberService.list(filter);
}

export async function createSubscriberAction(input: CreateSubscriberInput) {
  const subscriber = await subscriberService.create(input);
  revalidatePath("/app/subscribers");
  return subscriber;
}

export async function updateSubscriberAction(input: UpdateSubscriberInput) {
  const subscriber = await subscriberService.update(input);
  revalidatePath("/app/subscribers");
  revalidatePath(`/app/subscribers/${input.id}`);
  return subscriber;
}

export async function archiveSubscriberAction(id: string) {
  await subscriberService.archive(id);
  revalidatePath("/app/subscribers");
}
