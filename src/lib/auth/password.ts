import "server-only";
import bcrypt from "bcryptjs";

/**
 * تجزئة/تحقق كلمات المرور لحسابات البريد/الهاتف (Password Auth).
 *
 * bcryptjs (تطبيق JS خالص لـ bcrypt، لا يحتاج native bindings) بدل
 * bcrypt الأصلي: نفس الخوارزمية والتنسيق (متوافقة تمامًا مع أي hash من
 * bcrypt العادي)، لكن أكثر أمانًا للنشر على بيئات serverless (Vercel)
 * لأنها لا تحتاج إعادة بناء native module لكل معمارية/إصدار Node.
 *
 * ⚠️ لم يُشغَّل `npm install` فعليًا في هذه الجلسة (لا شبكة) - واجهة
 * bcryptjs (`hash`, `compare`) مستقرة جدًا ومعروفة، لكن راجع أن الحزمة
 * ثُبِّتت فعليًا (`npm install`) قبل النشر.
 */

const SALT_ROUNDS = 12;

export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * فحص قوة كلمة مرور بسيط لكن حقيقي (Server Side = مصدر الحقيقة، Client
 * Side يكرر نفس المنطق فقط لتحسين UX الفوري - راجع المتطلب صراحةً).
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `كلمة المرور قصيرة جدًا (${MIN_PASSWORD_LENGTH} أحرف على الأقل)`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل";
  }
  return null;
}
