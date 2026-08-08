import "server-only";
import { cookies } from "next/headers";

/**
 * ⚠️ نقطة عدم تأكد صريحة (نفس نمط e2e/auth-helper.ts): اسم كوكي الجلسة
 * الافتراضي لـ Auth.js v5 هو `authjs.session-token` (أو
 * `__Secure-authjs.session-token` عندما `useSecureCookies` مُفعَّل - وهو
 * تلقائي في production عبر HTTPS). لم يُتحقَّق من عدم وجود إعداد `cookies`
 * مخصَّص في auth.config.ts يُغيّر هذا الاسم - راجعه فعليًا قبل الاعتماد
 * على المرحلة 11 بالكامل، لأن كل منطق بوابة 2FA يعتمد على قراءة هذا
 * الكوكي بنجاح.
 */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export async function getCurrentSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(getSessionCookieName())?.value ?? null;
}
