import "server-only";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { requirePlatformAdmin } from "@/lib/platform/context";
import { getCurrentSessionToken } from "@/lib/security/session-cookie";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  encryptMfaSecret,
  decryptMfaSecret,
  hashRecoveryCode,
  generateRecoveryCode,
} from "@/lib/security/mfa-crypto";
import { platformMfaRepository } from "../repository/platform-mfa.repository";
import { prisma } from "@/lib/prisma";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";

const RECOVERY_CODES_COUNT = 8;

/**
 * ⚠️ راجع ملاحظات التحقق التفصيلية في:
 *   - src/lib/security/mfa-crypto.ts (لم يُختبَر التشفير فعليًا)
 *   - src/lib/security/session-cookie.ts (اسم كوكي الجلسة غير مؤكَّد)
 * لم يُشغَّل `npm install` فعليًا - واجهتا `otpauth`/`qrcode` المستخدَمتان
 * هنا مبنيتان على معرفتي المعتادة بهما (مكتبتان مستقرتان جدًا، ثقة
 * عالية نسبيًا مقارنة بـ arabic-reshaper/bidi-js في PR-6) لكن غير
 * مُختبَرتين فعليًا في هذه الجلسة.
 */

function buildTotp(email: string, base32Secret: string) {
  return new OTPAuth.TOTP({
    issuer: "أمبير",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
}

export const platformMfaService = {
  /**
   * الخطوة 1 من التسجيل: يولّد سرًا جديدًا ويُخزّنه مُشفَّرًا (مؤقتًا -
   * mfaEnabled يبقى false حتى confirmEnroll). يُعيد رمز QR جاهزًا للعرض.
   */
  async startEnrollment() {
    const ctx = await requirePlatformAdmin();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });

    const secret = new OTPAuth.Secret({ size: 20 }); // 160-bit، المعيار الموصى به لـ TOTP
    const totp = buildTotp(user.email, secret.base32);

    await platformMfaRepository.savePendingSecret(ctx.userId, encryptMfaSecret(secret.base32));

    const otpauthUri = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

    return { qrCodeDataUrl, secretForManualEntry: secret.base32 };
  },

  /**
   * الخطوة 2: يتحقق من كود 6 أرقام من تطبيق المصادقة قبل تفعيل 2FA
   * فعليًا. عند النجاح: يُفعِّل 2FA، يولّد أكواد استرداد (تُعرَض مرة
   * واحدة فقط)، ويُعلِّم الجلسة الحالية كمُتحقَّق منها فورًا.
   */
  async confirmEnrollment(code: string) {
    const ctx = await requirePlatformAdmin();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });

    if (!user.mfaSecretEncrypted) {
      throw new Error("لم يبدأ إعداد 2FA بعد - يرجى مسح رمز QR أولاً");
    }

    const secret = decryptMfaSecret(user.mfaSecretEncrypted);
    const totp = buildTotp(user.email, secret);
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new Error("الكود غير صحيح - تأكد من مزامنة ساعة جهازك وحاول مجددًا");
    }

    const recoveryCodes = Array.from({ length: RECOVERY_CODES_COUNT }, () => generateRecoveryCode());
    const hashed = recoveryCodes.map(hashRecoveryCode);

    await platformMfaRepository.enable(ctx.userId, hashed);

    const sessionToken = await getCurrentSessionToken();
    if (sessionToken) {
      await platformMfaRepository.markSessionMfaVerified(sessionToken);
    }

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.mfa.enabled",
      entityType: "User",
      entityId: ctx.userId,
    });

    return { recoveryCodes };
  },

  /**
   * تحدّي الدخول: يُستدعى من صفحة /mfa-verify بعد تسجيل الدخول عبر
   * Google مباشرة. يقبل إما كود TOTP عادي أو كود استرداد لمرة واحدة.
   * `skipMfaGate` ضروري هنا: هذه الدالة نفسها هي "بوابة" 2FA - استدعاء
   * requirePlatformAdmin() العادي بداخلها كان سيرمي MfaRequiredError من
   * جديد فورًا (حلقة لا نهائية منطقيًا) لأن الجلسة لم تُتحقَّق منها بعد.
   */
  async verifyChallenge(codeOrRecoveryCode: string) {
    const ctx = await requirePlatformAdmin(undefined, { skipMfaGate: true });

    // المرحلة 12: بلا هذا الحد، يستطيع مهاجم يملك جلسة مسروقة (كوكي) لكن
    // بلا جهاز المصادقة تجربة كل الأكواد الممكنة آليًا حتى يصيب واحدًا
    // صحيحًا - كود TOTP من 6 أرقام مساحته صغيرة نسبيًا (مليون احتمال)
    // مقارنة بكلمة مرور، فمحاولات غير محدودة تجعله عمليًا قابلاً للكسر.
    await checkRateLimit(`mfa-verify:${ctx.userId}`, 10, 15 * 60 * 1000);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });

    if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new Error("2FA غير مُفعَّلة على هذا الحساب");
    }

    const normalizedInput = codeOrRecoveryCode.trim().toUpperCase();
    const isRecoveryFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedInput);

    let verified = false;
    if (isRecoveryFormat) {
      const inputHash = hashRecoveryCode(normalizedInput);
      if (user.mfaRecoveryCodesHashed.includes(inputHash)) {
        verified = true;
        const remaining = user.mfaRecoveryCodesHashed.filter((h) => h !== inputHash);
        await platformMfaRepository.consumeRecoveryCode(ctx.userId, remaining);
        await recordPlatformAuditEntry({
          adminUserId: ctx.userId,
          action: "platform.mfa.recovery_code_used",
          entityType: "User",
          entityId: ctx.userId,
        });
      }
    } else {
      const secret = decryptMfaSecret(user.mfaSecretEncrypted);
      const totp = buildTotp(user.email, secret);
      verified = totp.validate({ token: normalizedInput, window: 1 }) !== null;
    }

    if (!verified) {
      throw new Error("الكود غير صحيح");
    }

    const sessionToken = await getCurrentSessionToken();
    if (!sessionToken) throw new Error("تعذّر تحديد الجلسة الحالية");
    await platformMfaRepository.markSessionMfaVerified(sessionToken);

    return { verified: true as const };
  },

  /** تعطيل 2FA - يتطلّب كودًا صالحًا حاليًا (يمنع اختطاف جلسة مفتوحة من تعطيل الحماية). */
  async disable(code: string) {
    const ctx = await requirePlatformAdmin();
    await this.verifyChallenge(code);
    await platformMfaRepository.disable(ctx.userId);
    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.mfa.disabled",
      entityType: "User",
      entityId: ctx.userId,
    });
    return { disabled: true as const };
  },

  async getStatus() {
    const ctx = await requirePlatformAdmin();
    const state = await platformMfaRepository.findUserMfaState(ctx.userId);
    return {
      enabled: state.mfaEnabled,
      enrolledAt: state.mfaEnrolledAt,
      remainingRecoveryCodes: state.mfaRecoveryCodesHashed.length,
    };
  },
};
