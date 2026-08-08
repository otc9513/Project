import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAsTestUser, cleanupTestUser } from "./auth-helper";

/**
 * ⚠️ غير مُشغَّل فعليًا في هذه الجلسة - راجع e2e/README.md.
 *
 * المسار: Super Admin ينشئ إعلانًا مستهدِفًا لمستأجر A تحديدًا (ليس
 * allTenants) → مستأجر A يراه في /app → مستأجر B (غير مستهدَف) لا يراه
 * إطلاقًا (تحقّق تسريب سلبي - بنفس أهمية التحقق الإيجابي).
 */

const prisma = new PrismaClient();
const ADMIN_EMAIL = "e2e-superadmin@ampere-test.local";
const TARGETED_TENANT_EMAIL = "e2e-targeted-owner@ampere-test.local";
const OTHER_TENANT_EMAIL = "e2e-other-owner@ampere-test.local";

let targetedTenantId: string;
let otherTenantId: string;
let announcementId: string;

test.beforeAll(async () => {
  const plan = await prisma.plan.findFirst({ where: { isActive: true } });
  if (!plan) throw new Error("لا توجد أي خطة نشطة في قاعدة البيانات - شغّل npm run db:seed أولاً");

  const [targeted, other] = await Promise.all([
    prisma.tenant.create({
      data: {
        name: "مستأجر مستهدَف E2E",
        slug: `e2e-targeted-${Date.now()}`,
        planId: plan.id,
        status: "ACTIVE",
      },
    }),
    prisma.tenant.create({
      data: {
        name: "مستأجر آخر E2E",
        slug: `e2e-other-${Date.now()}`,
        planId: plan.id,
        status: "ACTIVE",
      },
    }),
  ]);
  targetedTenantId = targeted.id;
  otherTenantId = other.id;

  // إعلان يستهدف targetedTenantId حصرًا (allTenants: false) - راجع
  // src/features/platform-announcements/repository/platform-announcement.repository.ts
  const announcement = await prisma.announcement.create({
    data: {
      title: "إعلان اختبار E2E",
      description: "هذا إعلان اختبار مستهدِف",
      startDate: new Date(Date.now() - 60 * 60 * 1000),
      isActive: true,
      visibility: { allTenants: false, tenantIds: [targetedTenantId], planIds: [] },
    },
  });
  announcementId = announcement.id;
});

test.afterAll(async () => {
  await Promise.all([cleanupTestUser(TARGETED_TENANT_EMAIL), cleanupTestUser(OTHER_TENANT_EMAIL)]);
  await prisma.announcement.delete({ where: { id: announcementId } });
  await prisma.tenant.deleteMany({ where: { id: { in: [targetedTenantId, otherTenantId] } } });
});

test("المستأجر المستهدَف يرى الإعلان في /app", async ({ context, page }) => {
  await loginAsTestUser(context, {
    email: TARGETED_TENANT_EMAIL,
    name: "مالك مستهدَف",
    tenantId: targetedTenantId,
    role: "OWNER",
  });

  await page.goto("/app");
  await expect(page.getByText("إعلان اختبار E2E")).toBeVisible();
});

test("مستأجر آخر غير مستهدَف لا يرى الإعلان إطلاقًا (منع تسريب)", async ({ context, page }) => {
  await loginAsTestUser(context, {
    email: OTHER_TENANT_EMAIL,
    name: "مالك آخر",
    tenantId: otherTenantId,
    role: "OWNER",
  });

  await page.goto("/app");
  await expect(page.getByText("إعلان اختبار E2E")).not.toBeVisible();
});
