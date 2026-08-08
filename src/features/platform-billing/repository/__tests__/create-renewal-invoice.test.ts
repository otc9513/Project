import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { prismaMock } from "@/test/prisma-mock";
import { platformBillingRepository } from "../platform-billing.repository";

const baseTenant = {
  id: "tenant_1",
  billingCycle: "MONTHLY" as const,
  subscriptionEndsAt: new Date("2026-08-15T00:00:00.000Z"),
};

const fullTenant = {
  id: "tenant_1",
  planId: "plan_1",
  plan: { priceMonthly: { toString: () => "50000" } as unknown as Prisma.Decimal, priceYearly: null },
};

describe("createRenewalInvoiceIfDue - idempotency (المرحلة 7 / 8)", () => {
  it("لا يُنشئ فاتورة لمستأجر بلا billingCycle محدَّد (خطة مجانية)", async () => {
    const result = await platformBillingRepository.createRenewalInvoiceIfDue({
      id: "tenant_free",
      billingCycle: null,
      subscriptionEndsAt: null,
    });
    expect(result).toEqual({ created: false, reason: "no_billing_cycle" });
    expect(prismaMock.saasInvoice.create).not.toHaveBeenCalled();
  });

  it("لا يُنشئ فاتورة ثانية إن وُجدت فاتورة لنفس الفترة بالفعل (الفحص المسبق)", async () => {
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.tenant.findUniqueOrThrow.mockResolvedValue(fullTenant);
    // @ts-expect-error
    prismaMock.saasInvoice.findFirst.mockResolvedValue({ id: "existing_invoice" });

    const result = await platformBillingRepository.createRenewalInvoiceIfDue(baseTenant);

    expect(result).toEqual({ created: false, reason: "already_exists" });
    expect(prismaMock.saasInvoice.create).not.toHaveBeenCalled();
  });

  it("ينشئ الفاتورة عند عدم وجود فاتورة سابقة لنفس الفترة", async () => {
    // @ts-expect-error
    prismaMock.tenant.findUniqueOrThrow.mockResolvedValue(fullTenant);
    // @ts-expect-error
    prismaMock.saasInvoice.findFirst.mockResolvedValue(null);
    // @ts-expect-error
    prismaMock.saasInvoice.create.mockResolvedValue({ id: "new_invoice" });

    const result = await platformBillingRepository.createRenewalInvoiceIfDue(baseTenant);

    expect(result.created).toBe(true);
    expect(prismaMock.saasInvoice.create).toHaveBeenCalledTimes(1);
  });

  /**
   * ⚠️ يعتمد هذا الاختبار على توقيع منشئ Prisma.PrismaClientKnownRequestError
   * (message, { code, clientVersion }) كما هو موثَّق في Prisma - لم يُشغَّل
   * هذا الاختبار فعليًا بعد npm install، فتحقّق من التوقيع الفعلي إن فشل.
   */
  it("يلتقط انتهاك القيد الفريد (P2002) من تشغيل متزامن ويُعيد already_exists بدل رمي خطأ", async () => {
    // @ts-expect-error
    prismaMock.tenant.findUniqueOrThrow.mockResolvedValue(fullTenant);
    // @ts-expect-error
    prismaMock.saasInvoice.findFirst.mockResolvedValue(null); // الفحص المسبق لم يرَ شيئًا (تسابق - سبقنا تشغيل آخر)

    const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.0.0",
    });
    prismaMock.saasInvoice.create.mockRejectedValue(p2002Error);

    const result = await platformBillingRepository.createRenewalInvoiceIfDue(baseTenant);

    expect(result).toEqual({ created: false, reason: "already_exists" });
  });

  it("يُعيد رمي أي خطأ آخر غير P2002 (لا يُخفي أعطالًا حقيقية)", async () => {
    // @ts-expect-error
    prismaMock.tenant.findUniqueOrThrow.mockResolvedValue(fullTenant);
    // @ts-expect-error
    prismaMock.saasInvoice.findFirst.mockResolvedValue(null);
    prismaMock.saasInvoice.create.mockRejectedValue(new Error("db connection lost"));

    await expect(platformBillingRepository.createRenewalInvoiceIfDue(baseTenant)).rejects.toThrow(
      "db connection lost"
    );
  });
});
