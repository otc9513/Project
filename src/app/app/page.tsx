import type { ReactNode } from "react";
import Link from "next/link";
import { requireTenantContext } from "@/lib/tenant/context";
import { getDashboardSummaryAction } from "@/features/dashboard/actions/dashboard.actions";

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

const FAULT_PRIORITY_LABEL: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  CRITICAL: "حرجة",
};

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("ar-IQ")} د.ع`;
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClass = {
    default: "text-gray-900",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
  }[tone];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-gray-500">{title}</h2>
      {children}
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireTenantContext();
  const now = new Date();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const year = params.year ? Number(params.year) : now.getFullYear();

  const summary = await getDashboardSummaryAction({ month, year });

  const quickActions: Array<{ href: string; label: string; roles: string[] }> = [
    { href: "/app/collection", label: "تسجيل دفعة", roles: ["OWNER", "ADMIN", "ACCOUNTANT", "COLLECTOR"] },
    { href: "/app/subscribers", label: "إضافة مشترك", roles: ["OWNER", "ADMIN", "ACCOUNTANT"] },
    { href: "/app/billing", label: "توليد فواتير", roles: ["OWNER", "ADMIN", "ACCOUNTANT"] },
    { href: "/app/expenses", label: "تسجيل مصروف", roles: ["OWNER", "ADMIN", "ACCOUNTANT"] },
    { href: "/app/faults", label: "إبلاغ عن عطل", roles: ["OWNER", "ADMIN", "TECHNICIAN", "COLLECTOR"] },
    { href: "/app/maintenance", label: "تسجيل صيانة", roles: ["OWNER", "ADMIN", "TECHNICIAN"] },
    { href: "/app/reports", label: "التقارير", roles: ["OWNER", "ADMIN", "ACCOUNTANT"] },
  ].filter((a) => a.roles.includes(ctx.role));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">لوحة التحكم</h1>
        <form className="flex gap-2">
          <select
            name="month"
            defaultValue={month}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            name="year"
            defaultValue={year}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
          >
            عرض
          </button>
        </form>
      </div>

      {quickActions.length > 0 && (
        <Section title="إجراءات سريعة">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {summary.subscribers && (
        <Section title="المشتركون">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="إجمالي المشتركين" value={String(summary.subscribers.total)} />
            <StatCard label="نشطون" value={String(summary.subscribers.active)} tone="success" />
            <StatCard label="متأخرون بالدفع" value={String(summary.subscribers.debt)} tone="danger" />
            <StatCard label="موقوفون" value={String(summary.subscribers.suspended)} tone="warning" />
          </div>
        </Section>
      )}

      {summary.billing && (
        <Section title={`الفوترة — ${MONTH_NAMES[month - 1]} ${year}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="إيرادات محصّلة" value={formatCurrency(summary.billing.totalRevenue)} tone="success" />
            <StatCard label="مستحقات غير محصّلة" value={formatCurrency(summary.billing.totalOutstanding)} tone="danger" />
            <StatCard label="فواتير مدفوعة" value={String(summary.billing.paidCount)} />
            <StatCard label="فواتير غير مدفوعة" value={String(summary.billing.unpaidCount)} />
          </div>
        </Section>
      )}

      {summary.collection && (
        <Section title="التحصيل هذا الشهر">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="المبلغ المحصَّل" value={formatCurrency(summary.collection.collectedAmount)} tone="success" />
            <StatCard label="عدد الدفعات" value={String(summary.collection.paymentsCount)} />
          </div>
        </Section>
      )}

      {summary.expenses && (
        <Section title="المصاريف">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <StatCard label="إجمالي المصاريف" value={formatCurrency(summary.expenses.total)} tone="danger" />
            {typeof summary.netProfit === "number" && (
              <StatCard
                label="صافي الربح"
                value={formatCurrency(summary.netProfit)}
                tone={summary.netProfit >= 0 ? "success" : "danger"}
              />
            )}
          </div>
          {Object.keys(summary.expenses.byCategory).length > 0 && (
            <ul className="space-y-1 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              {Object.entries(summary.expenses.byCategory).map(([category, amount]) => (
                <li key={category} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{EXPENSE_CATEGORY_LABEL[category] ?? category}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {summary.fuel && (
        <Section title="الوقود">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="مشترى (لتر)" value={summary.fuel.purchasedLiters.toLocaleString("ar-IQ")} />
            <StatCard label="مستهلك (لتر)" value={summary.fuel.usedLiters.toLocaleString("ar-IQ")} />
            <StatCard label="كلفة الشراء" value={formatCurrency(summary.fuel.purchaseCost)} />
          </div>
        </Section>
      )}

      {summary.generators && (
        <Section title="المولدات">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="تعمل" value={String(summary.generators.operational)} tone="success" />
            <StatCard label="تحت الصيانة" value={String(summary.generators.underMaintenance)} tone="warning" />
            <StatCard label="متوقفة" value={String(summary.generators.offline)} tone="danger" />
          </div>
        </Section>
      )}

      {summary.maintenanceAlerts && summary.maintenanceAlerts.length > 0 && (
        <Section title="تنبيهات صيانة قادمة">
          <ul className="space-y-2">
            {summary.maintenanceAlerts.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 p-3 text-sm"
              >
                <span>
                  {record.generator.name} — {record.type}
                </span>
                <span className="font-medium text-warning">
                  {record.nextDueDate
                    ? new Date(record.nextDueDate).toLocaleDateString("ar-IQ")
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {summary.faultAlerts && summary.faultAlerts.openCount > 0 && (
        <Section title={`أعطال مفتوحة (${summary.faultAlerts.openCount})`}>
          <ul className="space-y-2">
            {summary.faultAlerts.items.map((fault) => (
              <li key={fault.id}>
                <Link
                  href={`/app/faults/${fault.id}`}
                  className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm"
                >
                  <span>
                    {fault.generator.name} — {fault.title}
                  </span>
                  <span className="font-medium text-danger">
                    {FAULT_PRIORITY_LABEL[fault.priority] ?? fault.priority}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
