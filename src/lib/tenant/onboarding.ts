import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

interface CreateTenantParams {
  userId: string;
  userEmail: string;
  userName: string;
}

/**
 * ينشئ مساحة عمل (Tenant) جديدة تلقائيًا لأي مستخدم يسجّل دخوله لأول مرة،
 * ويجعله OWNER عليها، ويشترك تلقائيًا في الخطة المجانية/الأساسية الافتراضية.
 *
 * هذا يحقق المتطلب: "أول تسجيل دخول ينشئ حساب المستخدم ومساحة العمل".
 */
export async function createTenantForNewUser({
  userId,
  userEmail,
  userName,
}: CreateTenantParams) {
  const defaultPlan = await prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { priceMonthly: "asc" },
  });

  if (!defaultPlan) {
    throw new Error(
      "لا توجد خطة اشتراك افتراضية (Plan) في قاعدة البيانات. يجب تشغيل seed أولاً."
    );
  }

  const baseSlug = slugify(userName || userEmail.split("@")[0] || "user");
  const slug = `${baseSlug}-${nanoid(5)}`.toLowerCase();

  // المرحلة 8: تبدأ كل مساحة عمل جديدة بحالة TRIAL (وليس ACTIVE مباشرة)
  // وفق دورة حياة الاشتراك الرسمية. إن كانت الخطة الافتراضية بدون فترة
  // تجربة (trialDays = 0، مثال: خطة مجانية بسعر 0)، تبدأ فعليًا كـ ACTIVE
  // لأنه لا يوجد شيء "لتجربته" قبل الدفع.
  const hasTrial = defaultPlan.trialDays > 0;

  await prisma.tenant.create({
    data: {
      name: `مساحة عمل ${userName}`,
      slug,
      planId: defaultPlan.id,
      status: hasTrial ? "TRIAL" : "ACTIVE",
      trialEndsAt: hasTrial
        ? new Date(Date.now() + defaultPlan.trialDays * 24 * 60 * 60 * 1000)
        : null,
      onboardedAt: new Date(),
      memberships: {
        create: {
          userId,
          role: "OWNER",
          isActive: true,
        },
      },
    },
  });
}

/**
 * يُستدعى عند أول تسجيل دخول لأي مستخدم (createUser event). إن كان بريده
 * الإلكتروني مدعوًّا مسبقًا للانضمام لفريق تشغيل المنصة (Super Admin دعاه
 * عبر PlatformAdminInvite)، يُمنح دور المنصة المحدد تلقائيًا وتُستهلك
 * الدعوة. لا يفعل شيئًا إن لم توجد دعوة مطابقة.
 */
export async function consumePlatformAdminInvite(userId: string, userEmail: string) {
  const invite = await prisma.platformAdminInvite.findUnique({
    where: { email: userEmail.toLowerCase() },
  });

  if (!invite || invite.consumedAt) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { platformRole: invite.role },
    }),
    prisma.platformAdminInvite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date() },
    }),
  ]);
}

function slugify(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "")
    .slice(0, 40) || "tenant";
}
