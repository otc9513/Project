import { z } from "zod";

/**
 * الشكل يطابق تمامًا ما يُرجعه `PushSubscription.toJSON()` في المتصفح:
 * { endpoint, keys: { p256dh, auth } }. لا نُخزّن الكائن الخام كما هو حتى
 * تبقى أعمدة قاعدة البيانات صريحة وقابلة للفهرسة/البحث لاحقًا.
 */
export const subscribeToPushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
});
export type SubscribeToPushInput = z.infer<typeof subscribeToPushSchema>;

export const unsubscribeFromPushSchema = z.object({
  endpoint: z.string().url(),
});
export type UnsubscribeFromPushInput = z.infer<typeof unsubscribeFromPushSchema>;
