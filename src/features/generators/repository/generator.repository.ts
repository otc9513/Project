import "server-only";
import { prisma } from "@/lib/prisma";
import type { CreateGeneratorInput, UpdateGeneratorInput } from "../schema/generator.schema";

/**
 * طبقة الوصول للبيانات الخاصة بالمولدات.
 * القاعدة الذهبية: كل دالة هنا تأخذ tenantId كوسيط إلزامي أول،
 * ولا تُستدعى أبدًا مباشرة من الـ UI - فقط عبر generator.service.ts
 * الذي يمرّر tenantId من requireTenantContext().
 */
export const generatorRepository = {
  findMany(tenantId: string) {
    return prisma.generator.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(tenantId: string, id: string) {
    return prisma.generator.findFirst({
      where: { id, tenantId }, // tenantId هنا هو خط الدفاع الأساسي ضد IDOR
    });
  },

  create(tenantId: string, data: CreateGeneratorInput) {
    return prisma.generator.create({
      data: { ...data, tenantId },
    });
  },

  /**
   * ملاحظة هندسية: Prisma's `update()` يقبل فقط الحقول الفريدة (unique) في WHERE،
   * لذا لا يمكن دمج tenantId مباشرة مع id في `update`. نستخدم `updateMany`
   * الذي يدعم شروط WHERE غير الفريدة، ونتحقق من count لضمان أن السجل
   * يتبع فعلاً هذا المستأجر قبل اعتبار العملية ناجحة (دفاع ضد IDOR).
   */
  async update(tenantId: string, { id, ...data }: UpdateGeneratorInput) {
    const result = await prisma.generator.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new Error("المولد غير موجود أو لا يتبع مساحة العمل الحالية");
    }
    return prisma.generator.findFirstOrThrow({ where: { id, tenantId } });
  },

  async archive(tenantId: string, id: string) {
    const result = await prisma.generator.updateMany({
      where: { id, tenantId },
      data: { status: "OFFLINE" },
    });
    if (result.count === 0) {
      throw new Error("المولد غير موجود أو لا يتبع مساحة العمل الحالية");
    }
  },

  countActive(tenantId: string) {
    return prisma.generator.count({
      where: { tenantId, status: "OPERATIONAL" },
    });
  },
};
