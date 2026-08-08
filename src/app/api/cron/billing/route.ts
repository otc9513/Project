import { NextResponse } from "next/server";
import { runBillingLifecycleCron } from "@/features/platform-billing/service/billing-cron.service";

/**
 * نقطة دخول Vercel Cron (راجع vercel.json للجدولة). ليست محمية عبر
 * NextAuth middleware (المسارات خارج /app و /super-admin مفتوحة أصلاً في
 * authorized() - راجع auth.config.ts) بل عبر سر خادم صرف لا يُكشَف أبدًا
 * للمتصفح: Vercel يرسل هذا السر تلقائيًا كترويسة Authorization لكل
 * استدعاء Cron مجدوَل، ونتحقق منه هنا يدويًا قبل تنفيذ أي شيء.
 *
 * GET (وليس POST) لأن هذا ما يستخدمه Vercel Cron فعليًا لاستدعاء المسار.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    // فشل آمن: بيئة بلا سر مُعرَّف تعني أن أي طرف يمكنه استدعاء هذا
    // المسار - نرفض التنفيذ بدل الوثوق بغياب الحماية.
    return NextResponse.json({ error: "CRON_SECRET غير مُعرَّف في هذه البيئة" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });
  }

  try {
    const result = await runBillingLifecycleCron();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل تنفيذ مهمة الفوترة الدورية";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
