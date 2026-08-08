import "server-only";

/**
 * العقد الذي يجب أن يحقّقه أي مزوّد دفع إلكتروني (Stripe، PayTabs،
 * Qi Card، إلخ) - يطابق المخطط المفاهيمي المطلوب في البرومبت حرفيًا:
 *
 *   PaymentService
 *         │
 *         ├── Provider (هذه الواجهة)
 *         └── ManualPayment (manual-provider.ts)
 *
 * لا يُحدَّد مزوّد فعلي هنا (راجع stub-provider.ts) لأنه لم يتوفر قرار
 * عمل بشأن أي بوابة فعلية يجب دمجها، ولا اتصال إنترنت في هذه الجلسة
 * لتثبيت SDK أي مزوّد فعلي - البنية جاهزة، التنفيذ الفعلي لمزوّد محدَّد
 * خطوة منفصلة تحتاج قرار عمل + بيانات اعتماد حقيقية.
 */
export interface CreateCheckoutParams {
  invoiceId: string;
  amountIQD: number;
  tenantName: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  /** معرّف العملية لدى المزوّد - يُخزَّن لاحقًا في SaasPayment.providerRef عند اكتمال الدفع. */
  providerRef: string;
}

/** حدث دفع مُطبَّع (Normalized) بعد فك تشفير/تحقق حمولة webhook الخام لأي مزوّد. */
export interface NormalizedPaymentEvent {
  type: "succeeded" | "failed";
  providerRef: string;
  invoiceId: string;
  amountIQD: number;
}

export interface PaymentProvider {
  readonly name: string;

  createCheckoutSession(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;

  /**
   * يجب أن يتحقق من التوقيع الرقمي للحمولة الخام قبل أي تفسير لها - هذا
   * هو المتطلب غير القابل للتفاوض في البرومبت: "الخادم/webhook هو
   * المصدر الوحيد للحقيقة، لا الواجهة الأمامية أبدًا".
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;

  /** يُستدعى فقط بعد نجاح verifyWebhookSignature. */
  parseWebhookEvent(rawBody: string): NormalizedPaymentEvent | null;
}

export class PaymentProviderNotConfiguredError extends Error {
  constructor(providerName: string) {
    super(
      `مزوّد الدفع "${providerName}" غير مُهيَّأ (لا بيانات اعتماد حقيقية في هذه البيئة) - الدفع الإلكتروني غير متاح حاليًا، استخدم سير العمل اليدوي.`
    );
    this.name = "PaymentProviderNotConfiguredError";
  }
}
