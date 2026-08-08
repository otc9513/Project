import { requireTenantContext } from "@/lib/tenant/context";
import {
  getMySubscriptionAction,
  listMyInvoicesAction,
} from "@/features/platform-billing/actions/tenant-billing.actions";
import { RenewNowButton } from "./_components/renew-now-button";

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "تجربة مجانية",
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  SUSPENDED: "مُعلَّق",
  CANCELLED: "ملغى",
};

const STATUS_COLOR: Record<string, string> = {
  TRIAL: "bg-warning/10 text-warning",
  ACTIVE: "bg-success/10 text-success",
  EXPIRED: "bg-danger/10 text-danger",
  SUSPENDED: "bg-danger/10 text-danger",
  CANCELLED: "bg-gray-200 text-gray-600",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  UNPAID: "غير مدفوعة",
  PAID: "مدفوعة",
  OVERDUE: "متأخرة",
  CANCELLED: "ملغاة",
};

const INVOICE_STATUS_COLOR: Record<string, string> = {
  UNPAID: "bg-warning/10 text-warning",
  PAID: "bg-success/10 text-success",
  OVERDUE: "bg-danger/10 text-danger",
  CANCELLED: "bg-gray-200 text-gray-600",
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" });
}

export default async function SubscriptionPage() {
  // يفرض tenant context خاصته (وليس فقط اعتمادًا على layout.tsx) لأن
  // هذه الصفحة تعرض بيانات مالية حسّاسة - خط دفاع صريح إضافي حتى لو
  // تغيّر تخطيط /app مستقبلاً.
  const ctx = await requireTenantContext();
  const canRenew = ctx.role === "OWNER" || ctx.role === "ADMIN";

  const [subscription, invoices] = await Promise.all([
    getMySubscriptionAction(),
    listMyInvoicesAction(),
  ]);

  const hasOpenInvoice = invoices.some(
    (inv) => inv.status === "UNPAID" || inv.status === "OVERDUE"
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">الاشتراك والفوترة</h1>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium">
            {subscription.plan.nameAr ?? subscription.plan.name}
          </p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[subscription.status]}`}
          >
            {STATUS_LABEL[subscription.status]}
          </span>
        </div>

        <dl className="space-y-1.5 text-sm">
          {subscription.status === "TRIAL" && (
            <div className="flex justify-between">
              <dt className="text-gray-500">انتهاء التجربة المجانية</dt>
              <dd>{formatDate(subscription.trialEndsAt)}</dd>
            </div>
          )}
          {subscription.subscriptionEndsAt && (
            <div className="flex justify-between">
              <dt className="text-gray-500">
                {subscription.status === "EXPIRED" ? "انتهى بتاريخ" : "التجديد القادم"}
              </dt>
              <dd>{formatDate(subscription.subscriptionEndsAt)}</dd>
            </div>
          )}
          {subscription.billingCycle && (
            <div className="flex justify-between">
              <dt className="text-gray-500">دورة الفوترة</dt>
              <dd>{subscription.billingCycle === "MONTHLY" ? "شهرية" : "سنوية"}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        {hasOpenInvoice ? (
          <p className="text-sm text-gray-600">
            لديك فاتورة قيد الانتظار بالأسفل - أكمل دفعها لتجديد اشتراكك.
          </p>
        ) : canRenew ? (
          <RenewNowButton defaultCycle={subscription.billingCycle} />
        ) : (
          <p className="text-sm text-gray-500">
            التجديد متاح فقط لمالك مساحة العمل أو المدير - تواصل معه عند الحاجة.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-gray-500">سجل الفواتير</h2>
        <ul className="space-y-2">
          {invoices.map((invoice) => {
            const remaining = Number(invoice.amount) - Number(invoice.paidAmount);
            return (
              <li
                key={invoice.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {invoice.billingCycle === "MONTHLY" ? "فاتورة شهرية" : "فاتورة سنوية"}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${INVOICE_STATUS_COLOR[invoice.status]}`}
                  >
                    {INVOICE_STATUS_LABEL[invoice.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  الفترة: {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    المبلغ: {Number(invoice.amount).toLocaleString("ar-IQ")} د.ع
                  </span>
                  {remaining > 0 && invoice.status !== "CANCELLED" && (
                    <span className="font-medium text-danger">
                      المتبقي: {remaining.toLocaleString("ar-IQ")} د.ع
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {invoices.length === 0 && (
            <li className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              لا توجد فواتير بعد
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
