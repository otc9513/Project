import { platformOverviewAction } from "@/features/platform-tenants/actions/platform-tenant.actions";

const STAT_CARDS = [
  { key: "totalTenants", label: "إجمالي المستأجرين" },
  { key: "activeTenants", label: "مستأجرون نشطون" },
  { key: "trialTenants", label: "في فترة تجربة" },
  { key: "expiredTenants", label: "منتهية الصلاحية" },
  { key: "suspendedTenants", label: "معلَّقون" },
  { key: "newLast30Days", label: "جدد خلال 30 يوم" },
] as const;

export default async function SuperAdminOverviewPage() {
  const overview = await platformOverviewAction();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-bold">نظرة عامة على المنصة</h1>

      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">الإيراد الشهري المتكرر (MRR)</p>
        <p className="mt-1 text-3xl font-bold text-primary">
          {overview.mrr.toLocaleString("ar-IQ")} <span className="text-base font-normal">د.ع</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold">{overview[card.key].toLocaleString("ar-IQ")}</p>
            <p className="mt-1 text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
