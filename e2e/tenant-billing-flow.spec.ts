import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAsTestUser, cleanupTestUser } from "./auth-helper";

/**
 * ⚠️ غير مُشغَّل فعليًا في هذه الجلسة - راجع e2e/README.md ونقطة عدم
 * التأكد الموثَّقة في auth-helper.ts (اسم كوكي الجلسة) قبل أول تشغيل.
 *
 * المسار: تسجيل دخول (متجاوَز عبر جلسة DB مباشرة) → /app (لوحة
 * المستأجر) → /app/subscription → التحقق من ظهور الخطة وسجل الفواتير.
 */

const prisma = new PrismaClient();
const TEST_EMAIL = "e2e-owner@ampere-test.local";

let tenantId: string;

test.beforeAll(async () => {
  const plan = await prisma.plan.findFirst({ where: { isActive: true } });
  if (!plan) throw new Error("لا توجد أي خطة نشطة في قاعدة البيانات - شغّل npm run db:seed أولاً");

  const tenant = await prisma.tenant.create({
    data: {
      name: "مستأجر اختبار E2E",
      slug: `e2e-tenant-${Date.now()}`,
      planId: plan.id,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      subscriptionEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });
  tenantId = tenant.id;

  await prisma.saasInvoice.create({
    data: {
      tenantId,
      planId: plan.id,
      amount: plan.priceMonthly,
      billingCycle: "MONTHLY",
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: "UNPAID",
    },
  });
});

test.afterAll(async () => {
  await cleanupTestUser(TEST_EMAIL);
  await prisma.saasInvoice.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
});

test("مالك مساحة العمل يرى اشتراكه وفاتورته المعلَّقة فقط", async ({ page, context }) => {
  await loginAsTestUser(context, {
    email: TEST_EMAIL,
    name: "مالك اختبار",
    tenantId,
    role: "OWNER",
  });

  await page.goto("/app");
  await expect(page).not.toHaveURL(/\/login/);

  await page.goto("/app/subscription");
  await expect(page.getByText("الاشتراك والفوترة")).toBeVisible();
  // حالة ACTIVE مع فاتورة UNPAID معلَّقة - الزر يجب أن يتحوّل لرسالة
  // "فاتورة قيد الانتظار" بدل زر "تجديد الآن" (راجع منطق hasOpenInvoice
  // في src/app/app/subscription/page.tsx)
  await expect(page.getByText("لديك فاتورة قيد الانتظار")).toBeVisible();
  await expect(page.getByText("غير مدفوعة")).toBeVisible();
});
