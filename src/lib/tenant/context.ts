import "server-only";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export class UnauthenticatedError extends Error {
  constructor() {
    super("المستخدم غير مسجّل الدخول");
    this.name = "UnauthenticatedError";
  }
}

export class NoActiveTenantError extends Error {
  constructor() {
    super("لا توجد مساحة عمل نشطة لهذا المستخدم");
    this.name = "NoActiveTenantError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "لا تملك صلاحية تنفيذ هذا الإجراء") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * المرحلة 9 (تدقيق أمني): دورة حياة الاشتراك (Phase 8) كانت مُخزَّنة في
 * قاعدة البيانات فقط بلا أي تطبيق فعلي على الوصول - أي مستأجر SUSPENDED
 * أو CANCELLED كان يستطيع الاستمرار باستخدام التطبيق بلا أي قيد فعلي.
 * هذا الخطأ يُرمى من requireTenantContext نفسها (نقطة الدخول الوحيدة
 * لكل server action في المشروع) فيغلق الوصول فعليًا لا شكليًا فقط.
 */
export class TenantSuspendedError extends Error {
  constructor(reason?: string | null) {
    super(reason ? `تم تعليق الوصول لهذه المساحة: ${reason}` : "تم تعليق الوصول لهذه المساحة");
    this.name = "TenantSuspendedError";
  }
}

export class TenantCancelledError extends Error {
  constructor() {
    super("تم إلغاء اشتراك هذه المساحة. تواصل مع الدعم لإعادة التفعيل");
    this.name = "TenantCancelledError";
  }
}

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: Role;
}

/**
 * نقطة الدخول الوحيدة والإلزامية لأي عملية تتطلب سياق مستأجر.
 *
 * كل Server Action وكل استعلام في طبقة الـ repositories يجب أن يبدأ
 * باستدعاء هذه الدالة والحصول على tenantId منها - ولا يجوز أبدًا
 * أخذ tenantId من مُدخلات الطلب (body/query) لأن ذلك يفتح ثغرة
 * IDOR تسمح لمستأجر بالوصول لبيانات مستأجر آخر عبر تعديل المعرّف.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthenticatedError();
  }

  // ملاحظة: النسخة الحالية تدعم مستأجرًا واحدًا نشطًا لكل مستخدم (via activeTenantId
  // في الكوكيز/الجلسة لاحقًا عند دعم تعدد المساحات). في المرحلة الأولى نأخذ أول
  // Membership نشطة للمستخدم.
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "asc" },
    include: { tenant: { select: { status: true, suspensionReason: true } } },
  });

  if (!membership) {
    throw new NoActiveTenantError();
  }

  // تطبيق فعلي لدورة حياة الاشتراك (راجع تعريف الأخطاء أعلاه): TRIAL/ACTIVE/
  // EXPIRED تمر عاديًا (EXPIRED يُقيَّد عبر تعطيل الميزات المدفوعة فقط،
  // وليس حجب كامل - صاحب المولد يحتاج رؤية بياناته حتى لو لم يجدّد بعد).
  if (membership.tenant.status === "SUSPENDED") {
    throw new TenantSuspendedError(membership.tenant.suspensionReason);
  }
  if (membership.tenant.status === "CANCELLED") {
    throw new TenantCancelledError();
  }

  return {
    userId: session.user.id,
    tenantId: membership.tenantId,
    role: membership.role,
  };
}

/**
 * يتحقق أن دور المستخدم الحالي ضمن الأدوار المسموح لها بتنفيذ الإجراء.
 * يُستخدم داخل كل Server Action حسّاس (فوترة، صلاحيات، حذف بيانات...).
 */
export function requireRole(ctx: TenantContext, allowedRoles: Role[]) {
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError(
      `هذا الإجراء متاح فقط لـ: ${allowedRoles.join(", ")}`
    );
  }
}

/**
 * يضمن أن سجلاً معينًا (تم جلبه بالفعل) يتبع فعلاً للمستأجر الحالي.
 * يُستخدم كخط دفاع ثانٍ بعد فلترة tenantId في WHERE، لمنع أي سهو برمجي.
 */
export function assertBelongsToTenant(
  ctx: TenantContext,
  recordTenantId: string
) {
  if (recordTenantId !== ctx.tenantId) {
    throw new ForbiddenError("هذا السجل لا يتبع مساحة العمل الحالية");
  }
}
