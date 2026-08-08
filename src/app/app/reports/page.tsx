import { getFullReportAction } from "@/features/reports/actions/report.actions";

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  FUEL: "الوقود",
  MAINTENANCE: "الصيانة",
  SPARE_PARTS: "قطع الغيار",
  SALARIES: "الرواتب",
  OTHER: "أخرى",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  PAID: "مدفوعة",
  UNPAID: "غير مدفوعة",
  PARTIAL: "مدفوعة جزئيًا",
  CANCELLED: "ملغاة",
};

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("ar-IQ")} د.ع`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const from = params.from ? new Date(params.from) : defaultFrom;
  const to = params.to ? new Date(params.to) : defaultTo;

  let report: Awaited<ReturnType<typeof getFullReportAction>> | null = null;
  let errorMessage: string | null = null;

  try {
    report = await getFullReportAction({ from, to });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "تعذّر تحميل التقارير";
  }

  const fromStr = toDateInputValue(from);
  const toStr = toDateInputValue(to);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">التقارير</h1>
      <p className="mb-4 text-sm text-gray-500">
        من {from.toLocaleDateString("ar-IQ")} إلى {to.toLocaleDateString("ar-IQ")}
      </p>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">من</span>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">إلى</span>
          <input
            type="date"
            name="to"
            defaultValue={toStr}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          عرض
        </button>
      </form>

      {errorMessage && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 text-center">
          <p className="text-sm font-medium text-warning">{errorMessage}</p>
          <p className="mt-1 text-xs text-gray-500">
            التقارير المتقدمة متاحة ضمن خطتَي &quot;احترافية&quot; و&quot;مؤسسية&quot; فقط.
          </p>
        </div>
      )}

      {report && (
        <>
          <div className="mb-4 flex gap-2">
            <a
              href={`/api/reports/pdf?from=${fromStr}&to=${toStr}`}
              className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-center text-sm font-medium"
            >
              تصدير PDF
            </a>
            <a
              href={`/api/reports/excel?from=${fromStr}&to=${toStr}`}
              className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-center text-sm font-medium"
            >
              تصدير Excel
            </a>
          </div>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">الملخص المالي</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="إجمالي الإيرادات" value={formatCurrency(report.financialSummary.totalRevenue)} />
              <StatCard label="إجمالي المصاريف" value={formatCurrency(report.financialSummary.totalExpenses)} />
              <StatCard label="صافي الربح" value={formatCurrency(report.financialSummary.netProfit)} />
              <StatCard label="عدد الدفعات" value={String(report.financialSummary.paymentsCount)} />
            </div>
            {Object.keys(report.financialSummary.invoices.byStatus).length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                {Object.entries(report.financialSummary.invoices.byStatus).map(([status, data]) => (
                  <li key={status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {INVOICE_STATUS_LABEL[status] ?? status} ({data.count})
                    </span>
                    <span className="font-medium">{formatCurrency(data.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">تحليل الإيرادات الشهري</h2>
            <ul className="space-y-1 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              {report.revenueAnalytics.monthly.map((m) => (
                <li key={`${m.year}-${m.month}`} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {MONTH_NAMES[m.month - 1]} {m.year}
                  </span>
                  <span className="font-medium">{formatCurrency(m.revenue)}</span>
                </li>
              ))}
              {report.revenueAnalytics.monthly.length === 0 && (
                <li className="text-center text-sm text-gray-400">لا توجد بيانات</li>
              )}
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">تحليل المصاريف حسب الفئة</h2>
            <ul className="space-y-1 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              {report.expenseAnalytics.byCategory.map((c) => (
                <li key={c.category} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {EXPENSE_CATEGORY_LABEL[c.category] ?? c.category} ({c.count})
                  </span>
                  <span className="font-medium">{formatCurrency(c.amount)}</span>
                </li>
              ))}
              {report.expenseAnalytics.byCategory.length === 0 && (
                <li className="text-center text-sm text-gray-400">لا توجد بيانات</li>
              )}
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-500">تقرير التحصيل حسب المحصّل</h2>
            <ul className="space-y-1 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              {report.collectionReport.byCollector.map((c) => (
                <li key={c.collectorId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {c.collectorName} ({c.paymentsCount} دفعة)
                  </span>
                  <span className="font-medium">{formatCurrency(c.amount)}</span>
                </li>
              ))}
              {report.collectionReport.byCollector.length === 0 && (
                <li className="text-center text-sm text-gray-400">لا توجد بيانات</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
