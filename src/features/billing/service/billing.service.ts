import "server-only";
import { addDays } from "date-fns";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { invoiceRepository } from "../repository/invoice.repository";
import {
  generateMonthlyInvoicesSchema,
  generateIndividualInvoiceSchema,
  invoiceFilterSchema,
  cancelInvoiceSchema,
  type GenerateMonthlyInvoicesInput,
  type GenerateIndividualInvoiceInput,
  type InvoiceFilterInput,
  type CancelInvoiceInput,
} from "../schema/billing.schema";

const CAN_BILL = ["OWNER", "ADMIN", "ACCOUNTANT"] as const;

export const billingService = {
  /**
   * توليد فواتير شهرية لكل المشتركين الذين لديهم اشتراك نشط ولم تُصدَر لهم
   * فاتورة عن هذا الشهر/السنة بعد. السعر يُؤخذ من اشتراكهم النشط الحالي
   * (وليس سعرًا ثابتًا) حتى تُطبَّق أي تغييرات سعر تمت عبر المرحلة 3.
   */
  async generateMonthly(input: GenerateMonthlyInvoicesInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_BILL]);

    const { month, year, dueInDays } = generateMonthlyInvoicesSchema.parse(input);
    const dueDate = addDays(new Date(), dueInDays);

    const subscribers = await invoiceRepository.findSubscribersDueForInvoice(
      ctx.tenantId,
      month,
      year
    );

    const invoicesToCreate = subscribers
      .filter((s) => s.subscriptions[0])
      .map((s) => ({
        tenantId: ctx.tenantId,
        subscriberId: s.id,
        subscriptionId: s.subscriptions[0]!.id,
        month,
        year,
        amount: s.subscriptions[0]!.monthlyPrice,
        dueDate,
        status: "UNPAID" as const,
      }));

    const result = await invoiceRepository.createMany(invoicesToCreate);

    await recordAuditEntry({
      ctx,
      action: "billing.monthly_generated",
      entityType: "Invoice",
      entityId: `${month}-${year}`,
      changes: { after: { month, year, count: result.count } },
    });

    return { generatedCount: result.count, skippedCount: subscribers.length - result.count };
  },

  async generateIndividual(input: GenerateIndividualInvoiceInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_BILL]);

    const { subscriberId, month, year, dueInDays } =
      generateIndividualInvoiceSchema.parse(input);

    const existing = await invoiceRepository.existsForPeriod(subscriberId, month, year);
    if (existing) {
      throw new Error("توجد فاتورة بالفعل لهذا المشترك عن هذا الشهر");
    }

    const { prisma } = await import("@/lib/prisma");
    const subscription = await prisma.subscription.findFirst({
      where: { subscriberId, status: "ACTIVE", subscriber: { tenantId: ctx.tenantId } },
    });
    if (!subscription) {
      throw new Error("لا يوجد اشتراك نشط لهذا المشترك");
    }

    const invoice = await invoiceRepository.create({
      tenantId: ctx.tenantId,
      subscriberId,
      subscriptionId: subscription.id,
      month,
      year,
      amount: subscription.monthlyPrice,
      dueDate: addDays(new Date(), dueInDays),
      status: "UNPAID",
    });

    await recordAuditEntry({
      ctx,
      action: "billing.individual_generated",
      entityType: "Invoice",
      entityId: invoice.id,
      changes: { after: invoice },
    });

    return invoice;
  },

  async list(rawFilter: Partial<InvoiceFilterInput>) {
    const ctx = await requireTenantContext();
    const filter = invoiceFilterSchema.parse(rawFilter);
    return invoiceRepository.findMany(ctx.tenantId, filter);
  },

  async getById(id: string) {
    const ctx = await requireTenantContext();
    const invoice = await invoiceRepository.findById(ctx.tenantId, id);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    return invoice;
  },

  /**
   * إلغاء فاتورة: محصور بـ OWNER/ADMIN فقط (وليس ACCOUNTANT) وفق مبدأ
   * "منع التعديلات غير المصرَّح بها" في المواصفات الأمنية، ويتطلب سببًا
   * إلزاميًا يُحفظ في سجل التدقيق.
   */
  async cancel(input: CancelInvoiceInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, ["OWNER", "ADMIN"]);

    const data = cancelInvoiceSchema.parse(input);
    await invoiceRepository.cancel(ctx.tenantId, data.invoiceId);

    await recordAuditEntry({
      ctx,
      action: "billing.invoice_cancelled",
      entityType: "Invoice",
      entityId: data.invoiceId,
      changes: { after: { reason: data.reason } },
    });
  },

  async monthlySummary(month: number, year: number) {
    const ctx = await requireTenantContext();
    return invoiceRepository.summaryTotals(ctx.tenantId, month, year);
  },
};
