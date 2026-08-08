import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant/context";
import { platformBillingRepository } from "../repository/platform-billing.repository";
import type { PaymentProvider } from "./provider";
import { stubProvider } from "./stub-provider";

/**
 * سجلّ المزوّدين الفعليين المتاحين. لا يوجد سوى `stubProvider` (يفشل
 * بوضوح - راجع تعليقه) في هذه اللحظة، لأنه لا توجد بيانات اعتماد حقيقية
 * أو قرار عمل بشأن أي بوابة تُعتمَد. إضافة مزوّد حقيقي لاحقًا = سطر واحد
 * هنا، بلا أي تعديل في بقية النظام (webhook route، UI، إلخ).
 */
const PROVIDERS: Record<string, PaymentProvider> = {
  stub: stubProvider,
};

function getActiveProvider(): PaymentProvider {
  const name = process.env.PAYMENT_GATEWAY_PROVIDER ?? "stub";
  return PROVIDERS[name] ?? stubProvider;
}

export const paymentService = {
  /**
   * يبدأ جلسة دفع إلكتروني لفاتورة مملوكة للمستأجر الحالي حصرًا - يتحقق
   * من tenantId عبر requireTenantContext() وليس من أي مُدخل خارجي، ثم
   * يتحقق إضافيًا أن الفاتورة تخص هذا المستأجر تحديدًا (IDOR: منع مستأجر
   * من بدء دفع - أو الأسوأ، رؤية رابط دفع - لفاتورة مستأجر آخر عبر تخمين
   * معرّف فاتورة).
   */
  async initiateCheckoutForMyInvoice(invoiceId: string) {
    const ctx = await requireTenantContext();
    const invoice = await prisma.saasInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { tenant: true },
    });

    if (invoice.tenantId !== ctx.tenantId) {
      throw new Error("هذه الفاتورة لا تخص مساحة عملك");
    }
    if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
      throw new Error("هذه الفاتورة لا تقبل الدفع في حالتها الحالية");
    }

    const provider = getActiveProvider();
    const remaining = Number(invoice.amount) - Number(invoice.paidAmount);
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    return provider.createCheckoutSession({
      invoiceId: invoice.id,
      amountIQD: remaining,
      tenantName: invoice.tenant.name,
      successUrl: `${baseUrl}/app/subscription?payment=success`,
      cancelUrl: `${baseUrl}/app/subscription?payment=cancelled`,
    });
  },

  /**
   * معالج webhook موحَّد بغض النظر عن المزوّد - يُستدعى من
   * /api/webhooks/payments/[provider]/route.ts فقط. الخادم هنا هو
   * المصدر الوحيد للحقيقة (لا نُصدّق أبدًا واجهة أمامية تقول "نجح
   * الدفع") - وهذا سبب وجود verifyWebhookSignature كخطوة أولى إلزامية
   * قبل أي تفسير للحمولة.
   */
  async handleWebhook(providerName: string, rawBody: string, signatureHeader: string | null) {
    const provider = PROVIDERS[providerName];
    if (!provider) {
      throw new Error(`مزوّد دفع غير معروف: ${providerName}`);
    }

    if (!provider.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new Error("توقيع webhook غير صالح - رُفض الطلب");
    }

    const event = provider.parseWebhookEvent(rawBody);
    if (!event) {
      // حمولة لا تحتوي حدثًا نهتم به (مثال: أحداث اختبار من لوحة تحكم
      // المزوّد) - نُقر بالاستلام دون فعل شيء، وليس خطأ.
      return { handled: false as const };
    }

    if (event.type === "failed") {
      // لا شيء لتسجيله عند فشل الدفع - الفاتورة تبقى UNPAID كما كانت.
      // (يمكن لاحقًا إضافة إشعار للمستأجر هنا إن رغبت المنتج بذلك).
      return { handled: true as const, action: "payment_failed" as const };
    }

    // recordedById=undefined عمدًا: لا مستخدم بشري وراء هذه الدفعة -
    // method=اسم المزوّد الفعلي (وليس "MANUAL") لتمييزها بوضوح في
    // سجل الفواتير. providerRef يضمن idempotency (راجع تعليق
    // platform-billing.repository.ts:recordPayment).
    const payment = await platformBillingRepository.recordPayment({
      saasInvoiceId: event.invoiceId,
      amount: event.amountIQD,
      method: provider.name,
      providerRef: event.providerRef,
    });

    return { handled: true as const, action: "payment_recorded" as const, payment };
  },
};
