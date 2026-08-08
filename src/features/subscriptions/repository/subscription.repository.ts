import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  CreateAmperePlanInput,
  CreateSubscriptionInput,
} from "../schema/subscription.schema";

export const amperePlanRepository = {
  findMany(tenantId: string) {
    return prisma.amperePlan.findMany({
      where: { tenantId, isActive: true },
      orderBy: { ampere: "asc" },
    });
  },

  findById(tenantId: string, id: string) {
    return prisma.amperePlan.findFirst({ where: { id, tenantId } });
  },

  create(tenantId: string, data: CreateAmperePlanInput) {
    return prisma.amperePlan.create({ data: { ...data, tenantId } });
  },
};

export const subscriptionRepository = {
  findById(tenantId: string, id: string) {
    return prisma.subscription.findFirst({
      where: { id, subscriber: { tenantId } },
      include: { amperePlan: true, generator: true, subscriber: true },
    });
  },

  findActiveBySubscriber(tenantId: string, subscriberId: string) {
    return prisma.subscription.findFirst({
      where: { subscriberId, status: "ACTIVE", subscriber: { tenantId } },
      include: { amperePlan: true, generator: true },
    });
  },

  create(data: CreateSubscriptionInput) {
    return prisma.subscription.create({ data });
  },

  /**
   * تنفيذ التغيير + تسجيل السجل التاريخي في معاملة واحدة (Transaction)
   * لضمان عدم حدوث تعديل بدون سجل تاريخي مطابق (سلامة بيانات مالية).
   */
  applyChange(
    tenantId: string,
    params: {
      subscriptionId: string;
      changedById: string;
      current: { amperePlanId: string; monthlyPrice: number; currentAmpere: number };
      newAmperePlanId?: string;
      newMonthlyPrice?: number;
    }
  ) {
    const { subscriptionId, changedById, current, newAmperePlanId, newMonthlyPrice } = params;

    return prisma.$transaction(async (tx) => {
      let newAmpereValue: number | null = null;
      if (newAmperePlanId) {
        const newPlan = await tx.amperePlan.findUniqueOrThrow({
          where: { id: newAmperePlanId },
        });
        newAmpereValue = Number(newPlan.ampere);
      }

      const updated = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          ...(newAmperePlanId ? { amperePlanId: newAmperePlanId } : {}),
          ...(newMonthlyPrice !== undefined ? { monthlyPrice: newMonthlyPrice } : {}),
        },
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId,
          changedById,
          previousAmpere: newAmperePlanId ? current.currentAmpere : null,
          newAmpere: newAmperePlanId ? newAmpereValue : null,
          previousPrice: newMonthlyPrice !== undefined ? current.monthlyPrice : null,
          newPrice: newMonthlyPrice !== undefined ? newMonthlyPrice : null,
        },
      });

      return updated;
    });
  },

  history(tenantId: string, subscriptionId: string) {
    return prisma.subscriptionHistory.findMany({
      where: { subscriptionId, subscription: { subscriber: { tenantId } } },
      orderBy: { changedAt: "desc" },
    });
  },
};
