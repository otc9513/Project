import { describe, it, expect, vi } from "vitest";
import { prismaMock } from "@/test/prisma-mock";

vi.mock("@/lib/tenant/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tenant/context")>("@/lib/tenant/context");
  return {
    ...actual,
    requireTenantContext: vi.fn(),
  };
});

import { requireTenantContext, ForbiddenError } from "@/lib/tenant/context";
import { tenantBillingService } from "../tenant-billing.service";

const mockedRequireTenantContext = requireTenantContext as unknown as ReturnType<typeof vi.fn>;

describe("tenantBillingService - عزل المستأجرين (لا يُقبَل tenantId من الخارج)", () => {
  it("listMyInvoices يستعلم فقط عن tenantId المستخرَج من السياق المصادَق عليه، لا من أي مُدخل آخر", async () => {
    mockedRequireTenantContext.mockResolvedValue({ tenantId: "tenant_A", role: "OWNER" });
    prismaMock.saasInvoice.findMany.mockResolvedValue([]);
    prismaMock.saasInvoice.count.mockResolvedValue(0);

    await tenantBillingService.listMyInvoices();

    const callArgs = prismaMock.saasInvoice.findMany.mock.calls[0][0];
    // التأكيد الحاسم: tenantId في استعلام قاعدة البيانات هو بالضبط ما
    // أعادته requireTenantContext المصادَق عليها من الجلسة - لا طريقة
    // للدالة نفسها لتمرير tenantId مختلف حتى لو أرادت (لا تأخذه كوسيط أصلاً).
    expect(callArgs?.where?.tenantId).toBe("tenant_A");
  });

  it("renewNow يرفض بدور غير OWNER/ADMIN (مثال: ACCOUNTANT) قبل لمس قاعدة البيانات إطلاقًا", async () => {
    mockedRequireTenantContext.mockResolvedValue({ tenantId: "tenant_A", role: "ACCOUNTANT" });

    await expect(tenantBillingService.renewNow("MONTHLY")).rejects.toThrow(ForbiddenError);
    expect(prismaMock.saasInvoice.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.saasInvoice.create).not.toHaveBeenCalled();
  });

  it("renewNow يرفض إنشاء فاتورة ثانية إن وُجدت فاتورة معلَّقة بالفعل لنفس المستأجر", async () => {
    mockedRequireTenantContext.mockResolvedValue({ tenantId: "tenant_A", role: "OWNER" });
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.saasInvoice.findFirst.mockResolvedValue({ id: "pending_invoice", status: "UNPAID" });

    await expect(tenantBillingService.renewNow("MONTHLY")).rejects.toThrow(
      "لديك فاتورة قيد الانتظار بالفعل"
    );

    const callArgs = prismaMock.saasInvoice.findFirst.mock.calls[0][0];
    expect(callArgs?.where?.tenantId).toBe("tenant_A");
    expect(prismaMock.saasInvoice.create).not.toHaveBeenCalled();
  });
});
