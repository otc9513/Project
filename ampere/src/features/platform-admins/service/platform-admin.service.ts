import "server-only";
import { requirePlatformAdmin, requireSuperAdminOnly } from "@/lib/platform/context";
import { ForbiddenError } from "@/lib/tenant/context";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { platformAdminRepository } from "../repository/platform-admin.repository";
import {
  inviteAdminSchema,
  revokeAdminSchema,
  cancelInviteSchema,
  type InviteAdminInput,
  type RevokeAdminInput,
  type CancelInviteInput,
} from "../schema/platform-admin.schema";

/**
 * إدارة فريق تشغيل المنصة نفسه: SUPER_ADMIN فقط يملك هذه الصلاحية بالكامل
 * - منطقيًا، لو استطاع Support/Finance Admin دعوة مسؤولين آخرين لكانا
 * قادرين على تصعيد صلاحياتهما ذاتيًا عبر دعوة حساب بديل بدور SUPER_ADMIN.
 */
export const platformAdminService = {
  async list() {
    await requirePlatformAdmin();
    const [admins, invites] = await Promise.all([
      platformAdminRepository.listActiveAdmins(),
      platformAdminRepository.listPendingInvites(),
    ]);
    return { admins, invites };
  },

  async invite(input: InviteAdminInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);
    // حماية من إساءة استخدام الدعوات (مثال: حساب مُخترَق يحاول دعوة عدد
    // كبير من البُرد كـ SUPER_ADMIN بسرعة) - 10 دعوات كحد أقصى كل ساعة.
    await checkRateLimit(`admin-invite:${ctx.userId}`, 10, 60 * 60 * 1000);

    const data = inviteAdminSchema.parse(input);
    const existing = await platformAdminRepository.findInviteByEmail(data.email);
    if (existing && !existing.consumedAt) {
      throw new Error("توجد دعوة معلَّقة بالفعل لهذا البريد الإلكتروني");
    }

    const invite = await platformAdminRepository.createInvite(data.email, data.role, ctx.userId);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.admin.invited",
      entityType: "PlatformAdminInvite",
      entityId: invite.id,
      changes: { after: { email: data.email, role: data.role } },
    });

    return invite;
  },

  async cancelInvite(input: CancelInviteInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const data = cancelInviteSchema.parse(input);
    await platformAdminRepository.cancelInvite(data.inviteId);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.admin.invite_cancelled",
      entityType: "PlatformAdminInvite",
      entityId: data.inviteId,
    });
  },

  async revoke(input: RevokeAdminInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const data = revokeAdminSchema.parse(input);

    if (data.userId === ctx.userId) {
      throw new Error("لا يمكنك سحب صلاحيتك الخاصة عن نفسك من هنا لتفادي فقدان الوصول لكل الفريق");
    }

    // حارس أمان: منع تصفير آخر SUPER_ADMIN في المنصة عن طريق الخطأ، ما
    // يترك المنصة بلا أي مسؤول قادر على إدارة الفريق أو الفوترة مطلقًا.
    const superAdminCount = await platformAdminRepository.countSuperAdmins();
    const target = (await platformAdminRepository.listActiveAdmins()).find(
      (a) => a.id === data.userId
    );
    if (target?.platformRole === "SUPER_ADMIN" && superAdminCount <= 1) {
      throw new ForbiddenError("لا يمكن سحب صلاحية آخر Super Admin في المنصة");
    }

    await platformAdminRepository.revokeRole(data.userId);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.admin.revoked",
      entityType: "User",
      entityId: data.userId,
    });
  },
};
