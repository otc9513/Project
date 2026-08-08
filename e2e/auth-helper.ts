import type { Page, BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * ⚠️ غير مُتحقَّق منه فعليًا (راجع e2e/README.md). النظام يستخدم Google
 * OAuth حصرًا كمزوّد هوية (لا Credentials provider) - لا توجد طريقة
 * واقعية لأتمتة "تسجيل الدخول عبر Google" داخل CI. البديل القياسي
 * لـ Auth.js v5 بجلسات قاعدة بيانات (`session.strategy = "database"` -
 * مؤكَّد من auth.config.ts) هو إنشاء صف Session مباشرة عبر Prisma
 * وضبط كوكي الجلسة يدويًا في متصفح Playwright، متجاوزًا تدفّق OAuth
 * بالكامل - هذا هو ما تنفّذه الدالة أدناه.
 *
 * نقطة غير مؤكَّدة تحديدًا: اسم كوكي الجلسة الافتراضي لـ Auth.js v5 هو
 * `authjs.session-token` (أو `__Secure-authjs.session-token` تحت
 * HTTPS/production) - لم يُتحقَّق من عدم وجود إعداد مخصَّص يُغيّر هذا
 * الاسم في auth.config.ts. إن فشل تسجيل الدخول في أول تشغيل فعلي، هذا
 * أول مكان يجب فحصه.
 */
const prisma = new PrismaClient();

export async function loginAsTestUser(
  context: BrowserContext,
  params: { email: string; name: string; tenantId?: string; role?: string }
) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: { email: params.email, name: params.name },
  });

  if (params.tenantId && params.role) {
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: params.tenantId } },
      update: { role: params.role as never },
      create: { userId: user.id, tenantId: params.tenantId, role: params.role as never },
    });
  }

  const sessionToken = `e2e-${user.id}-${Date.now()}`;
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  await context.addCookies([
    {
      name: "authjs.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      expires: Math.floor(expires.getTime() / 1000),
    },
  ]);
}

export async function cleanupTestUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.membership.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

export async function goToApp(page: Page, path: string) {
  await page.goto(path);
}
