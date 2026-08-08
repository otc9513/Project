import { describe, it, expect } from "vitest";
import { prismaMock } from "@/test/prisma-mock";
import { platformBillingRepository } from "../platform-billing.repository";

describe("recordPayment - idempotency عبر providerRef (webhook مكرَّر - المرحلة 10)", () => {
  it("إشعار webhook مكرَّر لنفس providerRef يُعيد الدفعة الموجودة بدل تسجيلها مرتين", async () => {
    const existingPayment = { id: "payment_1", providerRef: "pi_abc123", amount: 50000 };
    // @ts-expect-error - كائن جزئي كافٍ لغرض هذا الاختبار
    prismaMock.saasPayment.findUnique.mockResolvedValue(existingPayment);

    const result = await platformBillingRepository.recordPayment({
      saasInvoiceId: "invoice_1",
      amount: 50000,
      providerRef: "pi_abc123",
      method: "stub",
    });

    expect(result).toBe(existingPayment);
    // الحاسم: لا يُفتَح أي transaction جديد ولا يُحدَّث شيء - الفحص
    // المسبق يقصر الدائرة بالكامل.
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("providerRef غير موجود سابقًا يُتابِع للمسار العادي (transaction فعلي)", async () => {
    prismaMock.saasPayment.findUnique.mockResolvedValue(null);
    // @ts-expect-error
    prismaMock.$transaction.mockImplementation(async (fn) =>
      fn({
        saasInvoice: {
          findUniqueOrThrow: async () => ({
            id: "invoice_1",
            status: "UNPAID",
            amount: { toString: () => "50000" },
            paidAmount: { toString: () => "0" },
            tenantId: "tenant_1",
            periodEnd: new Date(),
          }),
          update: async () => ({}),
        },
        saasPayment: { create: async () => ({ id: "new_payment" }) },
        tenant: {
          findUniqueOrThrow: async () => ({ status: "ACTIVE", subscriptionEndsAt: null }),
          update: async () => ({}),
        },
      })
    );

    const result = await platformBillingRepository.recordPayment({
      saasInvoiceId: "invoice_1",
      amount: 50000,
      providerRef: "pi_new456",
      method: "stub",
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    // @ts-expect-error
    expect(result.id).toBe("new_payment");
  });
});
