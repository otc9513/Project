import "server-only";
import { requirePlatformAdmin } from "@/lib/platform/context";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { platformBillingRepository } from "../repository/platform-billing.repository";
import {
  generateSaasInvoiceSchema,
  recordSaasPaymentSchema,
  cancelSaasInvoiceSchema,
  listSaasInvoicesSchema,
  type GenerateSaasInvoiceInput,
  type RecordSaasPaymentInput,
  type CancelSaasInvoiceInput,
  type ListSaasInvoicesInput,
} from "../schema/platform-billing.schema";

/** فوترة SaaS: SUPER_ADMIN و FINANCE_ADMIN فقط - لا SUPPORT_ADMIN إطلاقًا. */
const BILLING_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN"] as const;

export const platformBillingService = {
  async list(input: ListSaasInvoicesInput) {
    await requirePlatformAdmin([...BILLING_ROLES, "SUPPORT_ADMIN"]); // الدعم يحتاج رؤية حالة الفوترة عند مساعدة عميل، بلا صلاحية تعديل
    const data = listSaasInvoicesSchema.parse(input);
    return platformBillingRepository.findMany(data);
  },

  async getById(id: string) {
    await requirePlatformAdmin();
    const invoice = await platformBillingRepository.findById(id);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    return invoice;
  },

  async generateInvoice(input: GenerateSaasInvoiceInput) {
    const ctx = await requirePlatformAdmin([...BILLING_ROLES]);
    const data = generateSaasInvoiceSchema.parse(input);

    const invoice = await platformBillingRepository.createForTenant(
      data.tenantId,
      data.billingCycle
    );

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.saas_invoice.generated",
      entityType: "SaasInvoice",
      entityId: invoice.id,
      targetTenantId: data.tenantId,
      changes: { after: { amount: invoice.amount, dueDate: invoice.dueDate } },
    });

    return invoice;
  },

  async recordPayment(input: RecordSaasPaymentInput) {
    const ctx = await requirePlatformAdmin([...BILLING_ROLES]);
    // يحد من تسجيل دفعات وهمية متكررة بسرعة (خطأ إدخال أو إساءة استخدام)
    await checkRateLimit(`saas-payment-record:${ctx.userId}`, 60, 60 * 60 * 1000);
    const data = recordSaasPaymentSchema.parse(input);

    const payment = await platformBillingRepository.recordPayment({
      ...data,
      recordedById: ctx.userId,
    });

    const invoice = await platformBillingRepository.findById(data.saasInvoiceId);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.saas_payment.recorded",
      entityType: "SaasPayment",
      entityId: payment.id,
      targetTenantId: invoice?.tenantId,
      changes: { after: { amount: data.amount } },
    });

    return payment;
  },

  async cancelInvoice(input: CancelSaasInvoiceInput) {
    const ctx = await requirePlatformAdmin([...BILLING_ROLES]);
    const data = cancelSaasInvoiceSchema.parse(input);

    const invoice = await platformBillingRepository.cancel(data.saasInvoiceId);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.saas_invoice.cancelled",
      entityType: "SaasInvoice",
      entityId: data.saasInvoiceId,
      targetTenantId: invoice.tenantId,
      changes: { after: { reason: data.reason } },
    });

    return invoice;
  },
};
