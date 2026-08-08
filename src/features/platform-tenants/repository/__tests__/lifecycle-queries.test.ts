import { describe, it, expect } from "vitest";
import { prismaMock } from "@/test/prisma-mock";
import { platformTenantRepository } from "../platform-tenant.repository";
import { platformBillingRepository } from "@/features/platform-billing/repository/platform-billing.repository";

describe("findExpiredTrials", () => {
  it("يستعلم فقط عن مستأجري TRIAL الذين تجاوز تاريخ انتهاء تجربتهم الآن", async () => {
    prismaMock.tenant.findMany.mockResolvedValue([]);

    await platformTenantRepository.findExpiredTrials();

    const callArgs = prismaMock.tenant.findMany.mock.calls[0][0];
    expect(callArgs?.where).toMatchObject({
      status: "TRIAL",
      trialEndsAt: { lt: expect.any(Date) },
    });
  });
});

describe("findExpiredActiveSubscriptions", () => {
  it("يستعلم فقط عن مستأجري ACTIVE الذين تجاوز تاريخ انتهاء اشتراكهم الآن", async () => {
    prismaMock.tenant.findMany.mockResolvedValue([]);

    await platformTenantRepository.findExpiredActiveSubscriptions();

    const callArgs = prismaMock.tenant.findMany.mock.calls[0][0];
    expect(callArgs?.where).toMatchObject({
      status: "ACTIVE",
      subscriptionEndsAt: { lt: expect.any(Date) },
    });
  });
});

describe("findTenantsDueForRenewalInvoice", () => {
  it("يستبعد مستأجري الخطة المجانية (billingCycle=null) صراحةً عبر شرط not:null", async () => {
    prismaMock.tenant.findMany.mockResolvedValue([]);

    await platformTenantRepository.findTenantsDueForRenewalInvoice(7);

    const callArgs = prismaMock.tenant.findMany.mock.calls[0][0];
    expect(callArgs?.where).toMatchObject({
      status: "ACTIVE",
      billingCycle: { not: null },
    });
  });

  it("يستخدم أفق تجديد مبني على عدد الأيام المُمرَّر (renewalLeadDays)", async () => {
    prismaMock.tenant.findMany.mockResolvedValue([]);
    const before = Date.now();

    await platformTenantRepository.findTenantsDueForRenewalInvoice(7);

    const callArgs = prismaMock.tenant.findMany.mock.calls[0][0];
    const horizon = (callArgs?.where?.subscriptionEndsAt as { lt: Date })?.lt;
    const expectedMin = before + 6.9 * 24 * 60 * 60 * 1000;
    const expectedMax = before + 7.1 * 24 * 60 * 60 * 1000;
    expect(horizon.getTime()).toBeGreaterThan(expectedMin);
    expect(horizon.getTime()).toBeLessThan(expectedMax);
  });
});

describe("markOverdue (platformBillingRepository)", () => {
  it("يعلّم فقط الفواتير UNPAID التي تجاوز تاريخ استحقاقها الآن", async () => {
    prismaMock.saasInvoice.updateMany.mockResolvedValue({ count: 3 });

    const result = await platformBillingRepository.markOverdue();

    expect(result.count).toBe(3);
    const callArgs = prismaMock.saasInvoice.updateMany.mock.calls[0][0];
    expect(callArgs?.where).toMatchObject({
      status: "UNPAID",
      dueDate: { lt: expect.any(Date) },
    });
  });
});
