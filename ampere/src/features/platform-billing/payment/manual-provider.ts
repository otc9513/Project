import "server-only";
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CreateCheckoutResult,
  NormalizedPaymentEvent,
} from "./provider";

/**
 * لا يوجد "checkout" حقيقي أو webhook للدفع اليدوي - هذا الكائن موجود
 * فقط ليُظهر صراحةً في الكود أن "الدفع اليدوي" هو أحد نوعي PaymentService
 * حسب المخطط المفاهيمي في البرومبت (PaymentService → Provider |
 * ManualPayment)، وليس استخدامًا فعليًا مباشرًا - سير العمل اليدوي
 * الحقيقي يبقى `platformBillingService.recordPayment` (Server Action من
 * لوحة Super Admin) كما كان دائمًا، بلا أي تعديل.
 */
export const manualPaymentProvider: PaymentProvider = {
  name: "manual",

  async createCheckoutSession(_params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    throw new Error(
      "الدفع اليدوي ليس له صفحة دفع إلكتروني - استخدم platformBillingService.recordPayment مباشرة من لوحة Super Admin"
    );
  },

  verifyWebhookSignature(): boolean {
    return false; // لا يوجد webhook للدفع اليدوي إطلاقًا
  },

  parseWebhookEvent(): NormalizedPaymentEvent | null {
    return null;
  },
};
