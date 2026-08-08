import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";
import { ForbiddenError, UnauthenticatedError } from "@/lib/tenant/context";
import { getCurrentSessionToken } from "@/lib/security/session-cookie";

export interface PlatformAdminContext {
  userId: string;
  role: PlatformRole;
}

/**
 * نقطة الدخول الوحيدة والإلزامية لأي عملية على لوحة Super Admin.
 *
 * قصدًا: هذه دالة مستقلة تمامًا عن `requireTenantContext()` (لا تستدعيها
 * ولا تشتق منها) لأن عضوية فريق تشغيل المنصة (User.platformRole) مفهوم
 * مختلف جذريًا عن عضوية مستأجر (Membership.role) - خلطهما كان سيسمح
 * نظريًا لموظف OWNER داخل مستأجر عادي بالوصول للوحة المنصة عبر خطأ برمجي
 * بسيط في مكان واحد فقط.
 *
 * `options.skipMfaGate`: مخصَّص حصرًا لـ platformMfaService.verifyChallenge
 * (صفحة /mfa-verify نفسها) - بدونه كانت هذه الدالة سترمي MfaRequiredError
 * من جديد فورًا داخل صفحة التحقق من 2FA نفسها (حلقة منطقية لا نهاية لها).
 * لا يستخدمه أي كود آخر في المشروع.
 */
export async function requirePlatformAdmin(
  allowedRoles?: PlatformRole[],
  options?: { skipMfaGate?: boolean }
): Promise<PlatformAdminContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthenticatedError();
  }

  const role = session.user.platformRole;
  if (!role) {
    throw new ForbiddenError("هذا الحساب لا يملك صلاحية الوصول للوحة تحكم المنصة");
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new ForbiddenError(`هذا الإجراء متاح فقط لـ: ${allowedRoles.join(", ")}`);
  }

  // المرحلة 11 (2FA): بوابة إلزامية لكل عضو فريق منصة فعَّل 2FA - تُستثنى
  // فقط صفحة /mfa-verify نفسها (skipMfaGate) لتفادي حلقة إعادة توجيه لا
  // نهائية. لا يُفحَص أي شيء هنا لحساب لم يُفعِّل 2FA أصلاً (mfaEnabled=false)
  // حفاظًا على أداء الاستعلامات - راجع mfa-crypto.ts/session-cookie.ts
  // لملاحظات التحقق غير المُنجَز فعليًا في هذه الجلسة.
  if (!options?.skipMfaGate) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { mfaEnabled: true },
    });

    if (user.mfaEnabled) {
      const sessionToken = await getCurrentSessionToken();
      const sessionRow = sessionToken
        ? await prisma.session.findUnique({ where: { sessionToken }, select: { mfaVerifiedAt: true } })
        : null;

      if (!sessionRow?.mfaVerifiedAt) {
        redirect("/mfa-verify");
      }
    }
  }

  return { userId: session.user.id, role };
}

/** اختصار: SUPER_ADMIN فقط (عمليات حسّاسة: حذف مستأجر، إدارة فريق المنصة، البراندنغ). */
export function requireSuperAdminOnly(ctx: PlatformAdminContext) {
  if (ctx.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("هذا الإجراء متاح فقط لـ Super Admin");
  }
}
