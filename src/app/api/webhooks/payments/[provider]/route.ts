import "server-only";
import { NextResponse } from "next/server";
import { paymentService } from "@/features/platform-billing/payment/payment-service";
import { checkRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";

/**
 * POST /api/webhooks/payments/stub (أو اسم أي مزوّد حقيقي يُضاف لاحقًا)
 *
 * ⚠️ الأمان هنا لا يعتمد على middleware.ts أو أي جلسة مستخدم - مزوّدو
 * الدفع يستدعون هذا المسار مباشرة بلا أي كوكي جلسة. الحماية الوحيدة
 * والصحيحة هي التحقق من التوقيع الرقمي (HMAC عادةً) داخل
 * `provider.verifyWebhookSignature` - وهذا يحدث داخل paymentService
 * قبل أي تفسير للحمولة، وليس هنا.
 *
 * نقرأ الجسم كنص خام (وليس `request.json()`) عمدًا: التحقق من التوقيع
 * يحتاج البايتات الخام بالضبط كما أرسلها المزوّد - أي تحويل/إعادة
 * تسلسل JSON قد يُغيّر الترتيب/المسافات ويُفشل التحقق حتى لو كانت
 * الحمولة صحيحة فعليًا.
 *
 * المرحلة 12: هذا المسار عام تمامًا (بلا مصادقة جلسة) - محدِّد المعدَّل
 * هنا مبني على IP المُرسِل (وليس userId كباقي نقاط النظام - لا مستخدم
 * مسجَّل هنا أصلاً) لمنع إغراق المسار بطلبات لتخمين توقيعات صالحة أو
 * استنزاف موارد المعالجة، دون أن يمنع مزوّد دفع حقيقي من إرسال أحداثه
 * الطبيعية (حد سخي: 30 محاولة/دقيقة لكل IP).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const resolvedParams = await params;
  const provider = resolvedParams.provider;

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await checkRateLimit(`webhook-payment:${clientIp}`, 30, 60 * 1000);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 429 });
    }
    throw error;
  }

  const rawBody = await request.text();
  // اسم رأس التوقيع يختلف باختلاف المزوّد (Stripe: stripe-signature،
  // PayTabs: قد يكون مختلفًا) - نمرّر كل الاحتمالات الشائعة ونترك
  // provider.verifyWebhookSignature يختار ما يعنيه فعليًا.
  const signature =
    request.headers.get("stripe-signature") ??
    request.headers.get("x-webhook-signature") ??
    request.headers.get("x-signature");

  try {
    const result = await paymentService.handleWebhook(provider, rawBody, signature);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل معالجة webhook";
    // 400 لا 500: توقيع غير صالح أو مزوّد غير معروف هو خطأ في الطلب
    // نفسه، وليس عطلاً داخليًا - يمنع أيضًا مهاجمًا من التمييز بسهولة بين
    // "توقيع خاطئ" و"عطل خادم" عبر رمز الحالة وحده.
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
