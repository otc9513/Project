import "server-only";
import crypto from "node:crypto";

/**
 * "لا تُطبِّق التشفير يدويًا" في البرومبت تعني عدم اختراع خوارزمية/بروتوكول
 * تشفير من الصفر - وليس عدم استخدام أي تشفير إطلاقًا. AES-256-GCM عبر
 * `node:crypto` (تطبيق OpenSSL القياسي المدمَج في Node.js، وليس كودًا
 * مكتوبًا هنا) هو بالضبط "القدرة الآمنة الجاهزة" الموازية لما تطلبه
 * التعليمات من منصات مثل Supabase Auth (غير مستخدَمة في هذا المشروع -
 * راجع ملاحظة auth.config.ts: Google OAuth + NextAuth حصرًا).
 *
 * ⚠️ لم يُختبَر فعليًا (بيئة بلا build) - المنطق قياسي جدًا (نمط IV+authTag
 * الموثَّق لـ AES-GCM في توثيق Node.js نفسه) لكن راجعه قبل الاعتماد عليه
 * إنتاجيًا.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const base64Key = process.env.MFA_ENCRYPTION_KEY;
  if (!base64Key) {
    throw new Error(
      "MFA_ENCRYPTION_KEY غير مُعرَّف - وّلّده عبر: openssl rand -base64 32"
    );
  }
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("MFA_ENCRYPTION_KEY يجب أن يكون 32 بايت بعد فك ترميز base64 (AES-256)");
  }
  return key;
}

/** يُعيد سلسلة واحدة "iv:authTag:ciphertext" (كلها hex) - تخزَّن كاملة في mfaSecretEncrypted. */
export function encryptMfaSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // الحجم الموصى به لـ GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptMfaSecret(payload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("صيغة mfaSecretEncrypted غير صالحة");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** أكواد الاسترداد: hash أحادي الاتجاه بسيط (SHA-256) - راجع تعليق الحقل في schema.prisma لتبرير كفايته هنا. */
export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** يولّد كودًا عشوائيًا مقروءًا بصيغة XXXX-XXXX (Base32 بلا أحرف ملتبسة بصريًا مثل 0/O، 1/I). */
export function generateRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[(random[i] ?? 0) % alphabet.length] ?? "";
    if (i === 3) code += "-";
  }
  return code;
}
