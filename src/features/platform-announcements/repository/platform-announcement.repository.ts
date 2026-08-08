import "server-only";
import { prisma } from "@/lib/prisma";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "../schema/platform-announcement.schema";

export const platformAnnouncementRepository = {
  findMany() {
    return prisma.announcement.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "desc" }] });
  },

  findById(id: string) {
    return prisma.announcement.findUnique({ where: { id } });
  },

  create(data: CreateAnnouncementInput) {
    return prisma.announcement.create({
      data: { ...data, visibility: data.visibility },
    });
  },

  update({ id, ...data }: UpdateAnnouncementInput) {
    return prisma.announcement.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.announcement.delete({ where: { id } });
  },

  /**
   * الاستعلام المستهلَك من طرف تطبيق المستأجر (وليس لوحة Super Admin):
   * يُرجع الإعلانات النشطة والمرئية *لهذا المستأجر تحديدًا* الآن (ضمن
   * نافذة startDate/endDate). فلترة الرؤية (كل المستأجرين/مستأجرون
   * محددون/خطط محددة) تتم في قاعدة البيانات على allTenants لتقليل حجم
   * النتائج، والباقي (tenantIds/planIds) في التطبيق لأن Json لا يدعم
   * استعلام "array contains" بشكل محمول عبر كل قواعد postgres بسهولة عبر Prisma.
   */
  async findVisibleForTenant(tenantId: string, planId: string) {
    const now = new Date();
    const candidates = await prisma.announcement.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return candidates.filter((a) => {
      const visibility = a.visibility as { allTenants: boolean; tenantIds: string[]; planIds: string[] };
      if (visibility.allTenants) return true;
      if (visibility.tenantIds?.includes(tenantId)) return true;
      if (visibility.planIds?.includes(planId)) return true;
      return false;
    });
  },
};
