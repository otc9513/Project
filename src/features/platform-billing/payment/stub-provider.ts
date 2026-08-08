import "server-only";
import type { PaymentProvider } from "./provider";
import { PaymentProviderNotConfiguredError } from "./provider";

/**
 * ⚠️ هذا ليس تكاملاً فعليًا مع أي بوابة دفع - لا اتصال إنترنت في هذه
 * الجلسة لتثبيت SDK أي مزوّد حقيقي (Stripe/PayTabs/Qi Card/إلخ)، ولا
 * قرار عمل بشأن أيها يُعتمَد. هذا الكائن موجود فقط ليُطابق واجهة
 * PaymentProvider بأمان (فشل واضح بدل استثناء غير مُعالَج) حتى يستطيع
 * `payment-service.ts` العمل دون تعديل بمجرد توفر مزوّد حقيقي لاحقًا.
 *
 * للتفعيل الفعلي لاحقًا:
 *   1) اختر مزوّدًا حقيقيًا مناسبًا للسوق العراقي/الإقليمي.
 *   2) ثبّت SDK الرسمي الخاص به (`npm install`).
 *   3) أنشئ ملفًا جديدًا (مثال: `stripe-provider.ts`) يُطبّق PaymentProvider
 *      فعليًا باستخدام ذلك الـ SDK.
 *   4) استبدل `stubProvider` بالمزوّد الجديد في `payment-service.ts`
 *      (سطر واحد - لا حاجة لأي تعديل آخر في بقية النظام).
 */
export const stubProvider: PaymentProvider = {
  name: "stub",

  async createCheckoutSession() {
    throw new PaymentProviderNotConfiguredError("stub");
  },

  verifyWebhookSignature() {
    return false;
  },

  parseWebhookEvent() {
    return null;
  },
};
