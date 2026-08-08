import "server-only";
import { prisma } from "@/lib/prisma";
import type { CreatePlanInput, UpdatePlanInput } from "../schema/platform-plan.schema";

export const platformPlanRepository = {
  findMany() {
    return prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { tenants: true } } },
    });
  },

  findById(id: string) {
    return prisma.plan.findUnique({ where: { id } });
  },

  create(data: CreatePlanInput) {
    return prisma.plan.create({ data });
  },

  update({ id, ...data }: UpdatePlanInput) {
    return prisma.plan.update({ where: { id }, data });
  },

  /**
   * لا نسمح بحذف خطة فعليًا (قد يفقد التاريخ المالي/المستأجرون المرجع
   * إليها معناه). "الحذف" من منظور المنتج هو تعطيل الاشتراك بها لعملاء
   * جدد فقط، مع بقائها سارية لمن يستخدمها فعلاً حتى تُنقَل يدويًا.
   */
  deactivate(id: string) {
    return prisma.plan.update({ where: { id }, data: { isActive: false } });
  },

  countTenantsOnPlan(id: string) {
    return prisma.tenant.count({ where: { planId: id } });
  },
};
