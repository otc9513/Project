import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName } from "@/lib/security/session-cookie";

/**
 * ============================================================================
 * قرار معماري مهم — لماذا لا يُستخدم next-auth Credentials Provider هنا
 * ============================================================================
 * المشروع يستخدم `session.strategy: "database"` مع PrismaAdapter (راجع
 * auth.config.ts) - وهذا ضروري لبقاء Google كما هو (لا نغيّر استراتيجية
 * الجلسات العامة إطلاقًا، كما يطلب البرومبت صراحة "لا تكسر Google").
 *
 * لكن Auth.js (next-auth v5) يفرض معماريًا أن Credentials Provider يعمل
 * فقط مع استراتيجية "jwt" - لا يمكنه إنشاء صف Session في قاعدة البيانات
 * عبر الـ adapter تلقائيًا (هذا موثّق رسميًا في Auth.js، وليس قيدًا من
 * عندي). محاولة استخدام signIn("credentials") هنا كانت سترمي خطأ وقت
 * التشغيل أو تجبرنا على تحويل كامل التطبيق لـ JWT (يُبطل جلسات Google
 * الحالية المخزَّنة في جدول Session، ويكسر نمط قراءة الجلسة في كل مكان
 * آخر بالمشروع الذي يفترض ضمنيًا database session).
 *
 * الحل الآمن الذي طبّقته (بدل اختراع بروتوكول غير آمن): إنشاء صف Session
 * يدويًا بنفس الشكل الذي ينشئه PrismaAdapter تمامًا (sessionToken عشوائي
 * عالي الإنتروبيا + userId + expires)، ثم ضبط نفس كوكي الجلسة الذي
 * تقرأه next-auth (`getSessionCookieName()` من src/lib/security/session-
 * cookie.ts - نفس الملف المستخدَم فعليًا في تدفّق 2FA الحالي). النتيجة:
 * `auth()` من next-auth يقرأ هذه الجلسة ويتعرف عليها بشكل طبيعي تمامًا،
 * لأنه فعليًا نفس آلية الـ adapter، دون تعديل next-auth أو استراتيجيته.
 *
 * ⚠️ لم يُختبَر فعليًا ببيئة تشغيل حقيقية (لا شبكة/قاعدة بيانات في هذه
 * الجلسة) - راجع قبل الاعتماد عليه إنتاجيًا.
 */

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // يطابق auth.config.ts

export async function createDatabaseSessionCookie(userId: string): Promise<void> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: { sessionToken, userId, expires },
  });

  const store = await cookies();
  store.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires,
  });
}

/** تُستخدم عند فشل خطوة لاحقة بعد إنشاء المستخدم (تراجع نظيف بدون جلسة يتيمة). */
export async function destroyCurrentDatabaseSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } }).catch(() => {});
  }
  store.delete(getSessionCookieName());
}
