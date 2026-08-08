import { describe, it, expect } from "vitest";
import { prismaMock } from "@/test/prisma-mock";
import { platformNotificationRepository } from "../platform-notification.repository";

const emptyAudience = { allUsers: false, tenantIds: [], planIds: [], roles: [] } as const;

describe("resolveAudienceSubscriptions", () => {
  it("allUsers=true يجلب كل الاشتراكات بلا أي شرط فلترة", async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([]);

    await platformNotificationRepository.resolveAudienceSubscriptions({
      ...emptyAudience,
      allUsers: true,
    });

    // يُستدعى بلا وسيط where إطلاقًا - جلب غير مُقيَّد فعلاً
    expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith();
  });

  it("جمهور فارغ تمامًا (لا allUsers ولا مستأجرون ولا خطط) يُعيد [] بلا أي استعلام لقاعدة البيانات", async () => {
    const result = await platformNotificationRepository.resolveAudienceSubscriptions(emptyAudience);

    expect(result).toEqual([]);
    expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
  });

  it("tenantIds وplanIds يُدمَجان بمنطق OR في شرط الاستعلام", async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([]);

    await platformNotificationRepository.resolveAudienceSubscriptions({
      ...emptyAudience,
      tenantIds: ["tenant_1"],
      planIds: ["plan_1"],
    });

    const callArgs = prismaMock.pushSubscription.findMany.mock.calls[0][0];
    expect(callArgs?.where?.OR).toEqual([
      { tenantId: { in: ["tenant_1"] } },
      { tenant: { planId: { in: ["plan_1"] } } },
    ]);
  });

  it("تضييق الأدوار (roles) يُطبَّق بعد الجلب (JS filter) على عضوية نفس tenantId فقط", async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: "sub_1",
        tenantId: "tenant_1",
        user: {
          memberships: [
            { tenantId: "tenant_1", role: "OWNER" },
            { tenantId: "tenant_2", role: "ADMIN" }, // عضوية بمستأجر آخر - يجب ألا تُطابِق
          ],
        },
      },
      {
        id: "sub_2",
        tenantId: "tenant_1",
        user: { memberships: [{ tenantId: "tenant_1", role: "TECHNICIAN" }] },
      },
      // @ts-expect-error - كائنات جزئية كافية لغرض هذا الاختبار
    ]);

    const result = await platformNotificationRepository.resolveAudienceSubscriptions({
      ...emptyAudience,
      tenantIds: ["tenant_1"],
      roles: ["OWNER"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("sub_1");
  });

  it("عضوية بمستأجر مختلف عن tenantId الاشتراك نفسه لا تُطابِق حتى لو كان الدور صحيحًا (منع تسريب عبر المستأجرين)", async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: "sub_1",
        tenantId: "tenant_1",
        // العضوية الوحيدة لهذا المستخدم بدور OWNER هي بمستأجر آخر تمامًا
        user: { memberships: [{ tenantId: "tenant_2", role: "OWNER" }] },
      },
      // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    ]);

    const result = await platformNotificationRepository.resolveAudienceSubscriptions({
      ...emptyAudience,
      tenantIds: ["tenant_1"],
      roles: ["OWNER"],
    });

    expect(result).toHaveLength(0);
  });
});
