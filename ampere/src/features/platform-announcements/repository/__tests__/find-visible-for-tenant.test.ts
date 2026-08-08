import { describe, it, expect } from "vitest";
import { prismaMock } from "@/test/prisma-mock";
import { platformAnnouncementRepository } from "../platform-announcement.repository";

function announcement(id: string, visibility: object) {
  return {
    id,
    isActive: true,
    startDate: new Date("2020-01-01"),
    endDate: null,
    priority: 0,
    createdAt: new Date(),
    visibility,
  };
}

describe("findVisibleForTenant", () => {
  it("allTenants=true يظهر لأي مستأجر بغض النظر عن tenantId/planId", async () => {
    // @ts-expect-error - كائنات جزئية كافية لغرض هذا الاختبار
    prismaMock.announcement.findMany.mockResolvedValue([
      announcement("a1", { allTenants: true, tenantIds: [], planIds: [] }),
    ]);

    const result = await platformAnnouncementRepository.findVisibleForTenant("tenant_x", "plan_x");
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("إعلان مستهدِف لمستأجر آخر فقط لا يظهر لهذا المستأجر (منع تسريب - المتطلب الأمني الصريح للمرحلة 2)", async () => {
    // @ts-expect-error
    prismaMock.announcement.findMany.mockResolvedValue([
      announcement("a1", { allTenants: false, tenantIds: ["tenant_other"], planIds: [] }),
    ]);

    const result = await platformAnnouncementRepository.findVisibleForTenant("tenant_x", "plan_x");
    expect(result).toHaveLength(0);
  });

  it("إعلان مستهدِف لـ tenantId هذا المستأجر تحديدًا يظهر له", async () => {
    // @ts-expect-error
    prismaMock.announcement.findMany.mockResolvedValue([
      announcement("a1", { allTenants: false, tenantIds: ["tenant_x"], planIds: [] }),
    ]);

    const result = await platformAnnouncementRepository.findVisibleForTenant("tenant_x", "plan_x");
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("إعلان مستهدِف بخطة (planId) هذا المستأجر يظهر له حتى بدون استهداف tenantId مباشر", async () => {
    // @ts-expect-error
    prismaMock.announcement.findMany.mockResolvedValue([
      announcement("a1", { allTenants: false, tenantIds: [], planIds: ["plan_x"] }),
    ]);

    const result = await platformAnnouncementRepository.findVisibleForTenant("tenant_x", "plan_x");
    expect(result.map((a) => a.id)).toEqual(["a1"]);
  });

  it("لا allTenants ولا tenantId مطابق ولا planId مطابق = لا يظهر", async () => {
    // @ts-expect-error
    prismaMock.announcement.findMany.mockResolvedValue([
      announcement("a1", { allTenants: false, tenantIds: ["tenant_other"], planIds: ["plan_other"] }),
    ]);

    const result = await platformAnnouncementRepository.findVisibleForTenant("tenant_x", "plan_x");
    expect(result).toHaveLength(0);
  });

  it("يستعلم فقط عن isActive=true وضمن نافذة startDate/endDate الزمنية (الفلترة الزمنية تتم في DB لا في JS)", async () => {
    prismaMock.announcement.findMany.mockResolvedValue([]);

    await platformAnnouncementRepository.findVisibleForTenant("tenant_x", "plan_x");

    const callArgs = prismaMock.announcement.findMany.mock.calls[0][0];
    expect(callArgs?.where).toMatchObject({
      isActive: true,
      startDate: { lte: expect.any(Date) },
      OR: [{ endDate: null }, { endDate: { gte: expect.any(Date) } }],
    });
  });
});
