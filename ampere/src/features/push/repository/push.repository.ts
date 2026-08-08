import "server-only";
import { prisma } from "@/lib/prisma";

export const pushRepository = {
  upsert(tenantId: string, userId: string, endpoint: string, p256dh: string, auth: string, userAgent?: string) {
    return prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint } },
      create: { tenantId, userId, endpoint, p256dh, auth, userAgent },
      update: { p256dh, auth, userAgent },
    });
  },

  deleteByEndpoint(userId: string, endpoint: string) {
    return prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  },

  /** يُستخدم عند فشل الإرسال بخطأ "الاشتراك لم يعد صالحًا" (410 Gone) من متصفح المستخدم */
  deleteById(id: string) {
    return prisma.pushSubscription.delete({ where: { id } });
  },

  findByUser(userId: string) {
    return prisma.pushSubscription.findMany({ where: { userId } });
  },

  findByTenant(tenantId: string) {
    return prisma.pushSubscription.findMany({ where: { tenantId } });
  },
};
