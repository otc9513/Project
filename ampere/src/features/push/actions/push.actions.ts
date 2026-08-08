"use server";

import { pushService } from "../service/push.service";
import type { SubscribeToPushInput, UnsubscribeFromPushInput } from "../schema/push.schema";

export async function subscribeToPushAction(input: SubscribeToPushInput) {
  await pushService.subscribe(input);
}

export async function unsubscribeFromPushAction(input: UnsubscribeFromPushInput) {
  await pushService.unsubscribe(input);
}
