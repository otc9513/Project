import { listFuelPurchasesAction, listFuelUsageAction } from "@/features/fuel/actions/fuel.actions";
import { listGeneratorsAction } from "@/features/generators/actions/generator.actions";
import { FuelForm } from "./_components/fuel-form";

const numberFormatter = new Intl.NumberFormat("ar-IQ");

export default async function FuelPage() {
  const [generators, purchases, usage] = await Promise.all([
    listGeneratorsAction(),
    listFuelPurchasesAction({}),
    listFuelUsageAction({}),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">الوقود</h1>
      <p className="mb-4 text-sm text-gray-500">
        إجمالي المشتريات {numberFormatter.format(Number(purchases.totalCost))} د.ع ·{" "}
        {numberFormatter.format(Number(purchases.totalLiters))} لتر · استهلاك{" "}
        {numberFormatter.format(Number(usage.totalLiters))} لتر
      </p>

      <FuelForm generators={generators.map((g) => ({ id: g.id, name: g.name }))} />

      <h2 className="mb-2 mt-6 text-sm font-bold text-gray-700">آخر عمليات الشراء</h2>
      <ul className="mb-6 space-y-2">
        {purchases.items.map((p) => (
          <li key={p.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{p.generator.name}</p>
              <p className="font-bold text-primary">{numberFormatter.format(Number(p.price))} د.ع</p>
            </div>
            <p className="text-sm text-gray-500">
              {numberFormatter.format(Number(p.quantityLiters))} لتر
              {p.supplier ? ` · ${p.supplier}` : ""}
            </p>
            <p className="text-xs text-gray-400">{new Date(p.date).toLocaleDateString("ar-IQ")}</p>
          </li>
        ))}
        {purchases.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            لا توجد عمليات شراء بعد
          </p>
        )}
      </ul>

      <h2 className="mb-2 text-sm font-bold text-gray-700">آخر سجلات الاستهلاك</h2>
      <ul className="space-y-2">
        {usage.items.map((u) => (
          <li key={u.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{u.generator.name}</p>
              <p className="font-bold">{numberFormatter.format(Number(u.quantityLiters))} لتر</p>
            </div>
            <p className="text-xs text-gray-400">{new Date(u.date).toLocaleDateString("ar-IQ")}</p>
          </li>
        ))}
        {usage.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            لا توجد سجلات استهلاك بعد
          </p>
        )}
      </ul>
    </div>
  );
}
