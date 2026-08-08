import { listPlatformPlansAction } from "@/features/platform-plans/actions/platform-plan.actions";
import { PlanForm } from "./_components/plan-form";

export default async function PlansPage() {
  const plans = await listPlatformPlansAction();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">الخطط</h1>

      <div className="space-y-3">
        {plans.map((plan) => (
          <details key={plan.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
              <span>
                {plan.nameAr}
                {!plan.isActive && (
                  <span className="mr-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    معطَّلة
                  </span>
                )}
              </span>
              <span className="text-gray-400">
                {Number(plan.priceMonthly).toLocaleString("ar-IQ")} د.ع/شهر ·{" "}
                {plan._count.tenants} مستأجر
              </span>
            </summary>
            <div className="border-t border-gray-100 p-4">
              <PlanForm
                initial={{
                  id: plan.id,
                  name: plan.name,
                  nameAr: plan.nameAr,
                  priceMonthly: Number(plan.priceMonthly),
                  priceYearly: plan.priceYearly ? Number(plan.priceYearly) : null,
                  trialDays: plan.trialDays,
                  maxGenerators: plan.maxGenerators,
                  maxSubscribers: plan.maxSubscribers,
                  maxEmployees: plan.maxEmployees,
                  features: plan.features as Record<string, boolean>,
                  sortOrder: plan.sortOrder,
                }}
              />
            </div>
          </details>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">إنشاء خطة جديدة</h2>
        <PlanForm />
      </div>
    </div>
  );
}
