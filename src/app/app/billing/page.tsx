import { requireTenantContext } from "@/lib/tenant/context";
import { listInvoicesAction } from "@/features/billing/actions/billing.actions";
import { GenerateInvoicesButton } from "./_components/generate-invoices-button";
import { CancelInvoiceButton } from "./_components/cancel-invoice-button";

const STATUS_LABEL: Record<string, string> = {
  PAID: "مدفوعة",
  UNPAID: "غير مدفوعة",
  PARTIAL: "مدفوعة جزئيًا",
  CANCELLED: "ملغاة",
};

const STATUS_COLOR: Record<string, string> = {
  PAID: "bg-success/10 text-success",
  UNPAID: "bg-danger/10 text-danger",
  PARTIAL: "bg-warning/10 text-warning",
  CANCELLED: "bg-gray-200 text-gray-600",
};

const CAN_MANAGE_BILLING = ["OWNER", "ADMIN", "ACCOUNTANT"];
const CAN_CANCEL = ["OWNER", "ADMIN"];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireTenantContext();
  const now = new Date();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const year = params.year ? Number(params.year) : now.getFullYear();

  const { items, total } = await listInvoicesAction({
    status: params.status as never,
    month,
    year,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">الفوترة</h1>
      <p className="mb-4 text-sm text-gray-500">
        {total} فاتورة — {month}/{year}
      </p>

      {CAN_MANAGE_BILLING.includes(ctx.role) && (
        <GenerateInvoicesButton month={month} year={year} />
      )}

      <form className="mb-4 flex gap-2">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="PAID">مدفوعة</option>
          <option value="UNPAID">غير مدفوعة</option>
          <option value="PARTIAL">مدفوعة جزئيًا</option>
          <option value="CANCELLED">ملغاة</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium"
        >
          تصفية
        </button>
      </form>

      <ul className="space-y-2">
        {items.map((invoice) => {
          const remaining = Number(invoice.amount) - Number(invoice.paidAmount);
          return (
            <li
              key={invoice.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">{invoice.subscriber.fullName}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[invoice.status]}`}
                >
                  {STATUS_LABEL[invoice.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500" dir="ltr">
                {invoice.subscriber.phone}
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
              {CAN_CANCEL.includes(ctx.role) &&
                invoice.status !== "PAID" &&
                invoice.status !== "CANCELLED" && (
                  <div className="mt-2">
                    <CancelInvoiceButton invoiceId={invoice.id} />
                  </div>
                )}
            </li>
          );
        })}

        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا توجد فواتير مطابقة
          </li>
        )}
      </ul>
    </div>
  );
}
