import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant/context";

interface RecordAuditEntryParams {
  ctx: TenantContext;
  action: string; // مثال: "subscriber.price_changed"
  entityType: string; // مثال: "Subscription"
  entityId: string;
  changes?: { before?: unknown; after?: unknown };
  request?: Request;
}

/**
 * يسجّل حدثًا في سجل التدقيق. يُستدعى من طبقة الـ services عند أي عملية
 * حسّاسة: تغيير سعر، تسجيل دفعة، حذف بيانات، تعديل صلاحيات...
 *
 * أمثلة الاستخدام المطلوبة في المواصفات:
 * "أحمد غيّر سعر المشترك من X إلى Y" / "الموظف سجّل دفعة" / "المدير غيّر خطة الاشتراك"
 */
export async function recordAuditEntry({
  ctx,
  action,
  entityType,
  entityId,
  changes,
  request,
}: RecordAuditEntryParams) {
  await prisma.auditLog.create({
    data: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action,
      entityType,
      entityId,
      changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
      ipAddress: request?.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request?.headers.get("user-agent") ?? undefined,
    },
  });
}

interface RecordPlatformAuditEntryParams {
  adminUserId: string;
  action: string; // مثال: "platform.tenant.suspended"
  entityType: string;
  entityId: string;
  /** المستأجر المستهدَف بالإجراء، إن وُجد (فارغ لإجراءات على مستوى المنصة كلها مثل تعديل البراندنغ). */
  targetTenantId?: string;
  changes?: { before?: unknown; after?: unknown };
  request?: Request;
}

/**
 * نفس جدول AuditLog (tenantId فيه اختياري أصلاً)، لكن باتجاه معاكس:
 * الفاعل (userId) هو عضو فريق تشغيل المنصة، و tenantId (إن وُجد) هو
 * *هدف* الإجراء وليس مساحة عمل الفاعل. يُستخدم من كل خدمات لوحة
 * Super Admin بدل recordAuditEntry (الذي يفترض ctx بصيغة TenantContext
 * لا تنطبق على مسؤولي المنصة).
 */
export async function recordPlatformAuditEntry({
  adminUserId,
  action,
  entityType,
  entityId,
  targetTenantId,
  changes,
  request,
}: RecordPlatformAuditEntryParams) {
  await prisma.auditLog.create({
    data: {
      tenantId: targetTenantId,
      userId: adminUserId,
      action,
      entityType,
      entityId,
      changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
      ipAddress: request?.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request?.headers.get("user-agent") ?? undefined,
    },
  });
}
