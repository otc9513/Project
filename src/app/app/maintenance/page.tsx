import { listMaintenanceAction, upcomingMaintenanceAction } from "@/features/maintenance/actions/maintenance.actions";
import { listGeneratorsAction } from "@/features/generators/actions/generator.actions";
import { MaintenanceForm } from "./_components/maintenance-form";

const numberFormatter = new Intl.NumberFormat("ar-IQ");

export default async function MaintenancePage() {
  const [generators, { items, total }, upcoming] = await Promise.all([
    listGeneratorsAction(),
    listMaintenanceAction({}),
    upcomingMaintenanceAction(14),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">الصيانة</h1>
      <p className="mb-4 text-sm text-gray-500">{total} سجل صيانة</p>

      {upcoming.length > 0 && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="mb-2 text-sm font-bold text-warning">تذكيرات صيانة قادمة (خلال 14 يوم)</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {upcoming.map((m) => (
              <li key={m.id}>
                {m.generator.name} — {m.nextDueDate ? new Date(m.nextDueDate).toLocaleDateString("ar-IQ") : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <MaintenanceForm generators={generators.map((g) => ({ id: g.id, name: g.name }))} />

      <ul className="space-y-2">
        {items.map((record) => (
          <li key={record.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{record.type}</p>
              <p className="font-bold text-primary">{numberFormatter.format(Number(record.cost))} د.ع</p>
            </div>
            <p className="text-sm text-gray-500">{record.generator.name}</p>
            {record.description && <p className="text-sm text-gray-500">{record.description}</p>}
            <p className="text-xs text-gray-400">{new Date(record.date).toLocaleDateString("ar-IQ")}</p>
          </li>
        ))}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا توجد سجلات صيانة بعد
          </p>
        )}
      </ul>
    </div>
  );
}
