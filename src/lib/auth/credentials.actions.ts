"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { hashPassword, verifyPassword } from "./password";
import { normalizeAndValidateIraqiPhone } from "./phone";
import { provisionNewUser } from "./provision-new-user";
import { createDatabaseSessionCookie, destroyCurrentDatabaseSession } from "./session-manager";
import {
  emailRegisterSchema,
  emailLoginSchema,
  phoneRegisterSchema,
  phoneLoginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "./credentials.schema";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

const DEFAULT_REDIRECT = "/app";
const GENERIC_LOGIN_ERROR = "بيانات الدخول غير صحيحة";
const GENERIC_SERVER_ERROR = "حدث خطأ أثناء إنشاء الحساب، حاول مجددًا";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

function isUniqueConstraintError(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray((error.meta as { target?: string[] } | undefined)?.target) &&
    ((error.meta as { target?: string[] }).target ?? []).includes(field)
  );
}

/**
 * تسجيل آمن مؤقت لأخطاء التسجيل غير المتوقعة (خطوة تشخيص - راجع التقرير
 * النهائي). يلتقط فقط: اسم الخطأ، كود Prisma إن وُجد، وأسماء الحقول
 * المتعارضة (P2002 target - أسماء أعمدة فقط، لا قيمها أبدًا)، والعملية
 * التي فشلت. لا يُسجَّل أبدًا: كلمة المرور، الـ hash، أي token، أي cookie،
 * أو أي محتوى آخر من جسم الطلب. يُستخدم Sentry.captureException (نفس
 * الـ logger المستخدَم فعليًا في billing-cron.service.ts) + console.error
 * كنسخة احتياطية محلية وقت التطوير.
 */
function logAuthFailure(operation: string, error: unknown): void {
  const safeMeta: Record<string, unknown> = { operation };

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    safeMeta.prismaCode = error.code;
    const target = (error.meta as { target?: string[] } | undefined)?.target;
    if (Array.isArray(target)) safeMeta.conflictingFields = target;
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    safeMeta.prismaCode = "VALIDATION_ERROR";
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    safeMeta.prismaCode = "INITIALIZATION_ERROR";
    // غالبًا يعني هذا فشل الاتصال بقاعدة البيانات نفسها (رابط خاطئ/DB
    // متوقفة) وليس خطأً في منطق التطبيق.
    safeMeta.errorCode = error.errorCode;
  }

  safeMeta.errorName = error instanceof Error ? error.name : typeof error;
  // نمرّر الرسالة كسياق فقط عبر Sentry (وليس عبر console في production)
  // لأن رسائل Prisma النصية أحيانًا تتضمّن أجزاءً من الاستعلام؛ حقول
  // meta أعلاه هي المصدر الآمن الموثوق دائمًا لتحديد السبب.
  console.error(`[auth:${operation}] فشل غير متوقع`, safeMeta);
  Sentry.captureException(error, { tags: { authOperation: operation }, extra: safeMeta });
}

// ============================================================================
// التسجيل بالبريد الإلكتروني
// ============================================================================
export async function registerWithEmailAction(
  input: unknown
): Promise<AuthActionResult> {
  const parsed = emailRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { email, password, name } = parsed.data;

  const ip = await getClientIp();
  try {
    await checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { ok: false, error: e.message };
    throw e;
  }

  let userId: string;
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name ?? email.split("@")[0],
      },
    });
    userId = user.id;
  } catch (error) {
    if (isUniqueConstraintError(error, "email")) {
      return { ok: false, error: "البريد الإلكتروني مستخدم مسبقًا" };
    }
    logAuthFailure("register-email:create-user", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  try {
    await provisionNewUser({
      userId,
      userEmail: email,
      userName: name ?? email.split("@")[0] ?? email,
    });
    await createDatabaseSessionCookie(userId);
  } catch (error) {
    // فشل ما بعد إنشاء المستخدم (مساحة العمل/الجلسة): لا نترك المستخدم في
    // حالة نصف-مسجَّل بصمت. الحساب أُنشئ فعليًا، لكن دون جلسة سارية -
    // يمكنه إعادة المحاولة عبر تسجيل الدخول لاحقًا بعد إصلاح السبب.
    logAuthFailure("register-email:provision-or-session", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  redirect(DEFAULT_REDIRECT);
}

// ============================================================================
// تسجيل الدخول بالبريد الإلكتروني
// ============================================================================
export async function loginWithEmailAction(input: unknown): Promise<AuthActionResult> {
  const parsed = emailLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { email, password } = parsed.data;
  const ip = await getClientIp();

  try {
    await checkRateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
    await checkRateLimit(`login-email:${email}`, 8, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { ok: false, error: e.message };
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    // نفس رسالة الخطأ سواء لم يوجد الحساب أو كانت كلمة المرور خاطئة أو
    // كان الحساب أُنشئ عبر Google بلا كلمة مرور - يمنع User Enumeration.
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  await createDatabaseSessionCookie(user.id);
  redirect(DEFAULT_REDIRECT);
}

// ============================================================================
// التسجيل برقم الهاتف العراقي
// ============================================================================
export async function registerWithPhoneAction(
  input: unknown
): Promise<AuthActionResult> {
  const parsed = phoneRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const phoneResult = normalizeAndValidateIraqiPhone(parsed.data.phone);
  if (!phoneResult.ok) {
    return { ok: false, error: phoneResult.error };
  }
  const { normalized: phone } = phoneResult;
  const { password, name } = parsed.data;

  const ip = await getClientIp();
  try {
    await checkRateLimit(`register:${ip}`, 10, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { ok: false, error: e.message };
    throw e;
  }

  let userId: string;
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        phone,
        passwordHash,
        // next-auth's Prisma schema يفرض email فريدًا (لا يقبل تكرار
        // null من الناحية الوظيفية لأنه ببساطة غير NULL هنا) - نولّد
        // بريدًا داخليًا فريدًا غير قابل للتسليم بدل تعديل schema
        // العلاقات الأساسية (email لا يزال @unique إلزاميًا وغير قابل
        // للحذف بدون كسر Google/بقية النظام الذي يفترض وجوده دومًا).
        email: `${phone.replace("+", "")}@phone.ampere.local`,
        name: name ?? phone,
      },
    });
    userId = user.id;
  } catch (error) {
    if (isUniqueConstraintError(error, "phone") || isUniqueConstraintError(error, "email")) {
      return { ok: false, error: "رقم الهاتف مستخدم مسبقًا" };
    }
    logAuthFailure("register-phone:create-user", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  try {
    await provisionNewUser({
      userId,
      userEmail: null,
      userName: name ?? phone,
    });
    await createDatabaseSessionCookie(userId);
  } catch (error) {
    logAuthFailure("register-phone:provision-or-session", error);
    return { ok: false, error: GENERIC_SERVER_ERROR };
  }

  redirect(DEFAULT_REDIRECT);
}

// ============================================================================
// تسجيل الدخول برقم الهاتف العراقي
// ============================================================================
export async function loginWithPhoneAction(input: unknown): Promise<AuthActionResult> {
  const parsed = phoneLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const phoneResult = normalizeAndValidateIraqiPhone(parsed.data.phone);
  if (!phoneResult.ok) {
    return { ok: false, error: phoneResult.error };
  }
  const { normalized: phone } = phoneResult;
  const { password } = parsed.data;

  const ip = await getClientIp();
  try {
    await checkRateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
    await checkRateLimit(`login-phone:${phone}`, 8, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { ok: false, error: e.message };
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.passwordHash) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  await createDatabaseSessionCookie(user.id);
  redirect(DEFAULT_REDIRECT);
}

// ============================================================================
// نسيت كلمة المرور (بريد إلكتروني فقط - لا يوجد OTP/SMS للهاتف، راجع
// التقرير النهائي لشرح سبب عدم توفير استعادة عبر الهاتف حاليًا)
// ============================================================================
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // ساعة واحدة
const RESET_IDENTIFIER_PREFIX = "pwreset:"; // يمنع أي تعارض نظري مع أي استخدام مستقبلي آخر لجدول VerificationToken

export async function requestPasswordResetAction(
  input: unknown
): Promise<AuthActionResult & { resetUrlForDev?: string }> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { email } = parsed.data;
  const ip = await getClientIp();

  try {
    await checkRateLimit(`pwreset:${ip}`, 5, 15 * 60 * 1000);
    await checkRateLimit(`pwreset:${email}`, 3, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { ok: false, error: e.message };
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // نفس الاستجابة الناجحة سواء وُجد الحساب أم لا - يمنع استخدام هذه
  // الميزة نفسها لاكتشاف أي بريد مسجَّل في النظام (User Enumeration).
  if (!user || !user.passwordHash) {
    return { ok: true };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const identifier = `${RESET_IDENTIFIER_PREFIX}${email}`;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashedToken,
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  // ⚠️ لا يوجد مزوّد إرسال بريد إلكتروني (Resend/SMTP/...) في المشروع
  // حاليًا. رابط الاستعادة يُبنى هنا لكن "إرساله" فعليًا يحتاج ربط مزوّد
  // بريد حقيقي - راجع القسم المخصص في التقرير النهائي. مؤقتًا (تطوير
  // فقط) يُعاد الرابط في الاستجابة بدل إرساله، خلف علم NODE_ENV صراحةً
  // حتى لا يتسرّب أي توكن في بيئة الإنتاج عبر الشبكة/الـ logs.
  const resetUrl = `/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, resetUrlForDev: resetUrl };
  }
  return { ok: true };
}

export async function resetPasswordAction(input: unknown): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { token, password } = parsed.data;
  const ip = await getClientIp();

  try {
    await checkRateLimit(`pwreset-confirm:${ip}`, 10, 15 * 60 * 1000);
  } catch (e) {
    if (e instanceof RateLimitExceededError) return { ok: false, error: e.message };
    throw e;
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!record || !record.identifier.startsWith(RESET_IDENTIFIER_PREFIX)) {
    return { ok: false, error: "رابط الاستعادة غير صالح" };
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { token: hashedToken } });
    return { ok: false, error: "انتهت صلاحية رابط الاستعادة، يرجى طلب رابط جديد" };
  }

  const email = record.identifier.slice(RESET_IDENTIFIER_PREFIX.length);
  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
    // إبطال كل الجلسات الحالية لهذا المستخدم عند تغيير كلمة المرور -
    // إجراء أمني قياسي (لو كانت الجلسة القديمة مسروقة، تصبح عديمة الفائدة فورًا).
  ]);
  await prisma.session.deleteMany({ where: { user: { email } } });

  return { ok: true };
}

export async function logoutCredentialsSessionAction(): Promise<void> {
  await destroyCurrentDatabaseSession();
  redirect("/login");
}
