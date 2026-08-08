import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { collectionRepository } from "../repository/collection.repository";
import {
  recordPaymentSchema,
  unpaidSubscribersFilterSchema,
  type RecordPaymentInput,
  type UnpaidSubscribersFilterInput,
} from "../schema/collection.schema";

/**
 * تسجيل الدفعات متاح لـ COLLECTOR (دوره الأساسي) بالإضافة إلى
 * OWNER/ADMIN/ACCOUNTANT للمرونة الإدارية.
 */
const CAN_COLLECT = ["OWNER", "ADMIN", "ACCOUNTANT", "COLLECTOR"] as const;

export const collectionService = {
  async listUnpaidSubscribers(rawFilter: Partial<UnpaidSubscribersFilterInput>) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_COLLECT]);
    const filter = unpaidSubscribersFilterSchema.parse(rawFilter);
    return collectionRepository.findUnpaidSubscribers(ctx.tenantId, filter);
  },

  async subscriberBalance(subscriberId: string) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_COLLECT]);
    const agg = await collectionRepository.subscriberBalance(subscriberId);
    const totalDue = Number(agg._sum.amount ?? 0);
    const totalPaid = Number(agg._sum.paidAmount ?? 0);
    return { balance: totalDue - totalPaid };
  },

  async paymentHistory(subscriberId: string) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_COLLECT]);
    return collectionRepository.paymentHistory(ctx.tenantId, subscriberId);
  },

  /**
   * تسجيل دفعة (كاملة أو جزئية). ملاحظة أمنية مهمة: subscriberId يُشتق من
   * الفاتورة نفسها بعد التحقق من ملكيتها للمستأجر - لا يُؤخذ من مُدخلات
   * الطلب مباشرة، لتفادي تسجيل دفعة على مشترك غير مرتبط فعليًا بالفاتورة.
   */
  async recordPayment(input: RecordPaymentInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...CAN_COLLECT]);

    const data = recordPaymentSchema.parse(input);

    const { prisma } = await import("@/lib/prisma");
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, tenantId: ctx.tenantId },
    });
    if (!invoice) {
      throw new Error("الفاتورة غير موجودة");
    }

    const payment = await collectionRepository.recordPayment({
      tenantId: ctx.tenantId,
      invoiceId: data.invoiceId,
      subscriberId: invoice.subscriberId,
      collectedById: ctx.userId,
      amount: data.amount,
      note: data.note,
    });

    await recordAuditEntry({
      ctx,
      action: "payment.recorded",
      entityType: "Payment",
      entityId: payment.id,
      changes: { after: { invoiceId: data.invoiceId, amount: data.amount } },
    });

    return payment;
  },
};
