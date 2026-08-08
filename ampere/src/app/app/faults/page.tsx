import Link from "next/link";
import { listFaultsAction } from "@/features/faults/actions/fault.actions";
import { listGeneratorsAction } from "@/features/generators/actions/generator.actions";
import { FaultForm } from "./_components/fault-form";

const STATUS_LABEL: Record<string, string> = {
  NEW: "جديد",
  IN_PROGRESS: "قيد المعالجة",
  COMPLETED: "مكتمل",
};

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-danger/10 text-danger",
  IN_PROGRESS: "bg-warning/10 text-warning",
  COMPLETED: "bg-success/10 text-success",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  CRITICAL: "حرجة",
};

export default async function FaultsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const [generators, { items, total }] = await Promise.all([
    listGeneratorsAction(),
    listFaultsAction({ status: params.status as never }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">الأعطال</h1>
      <p className="mb-4 text-sm text-gray-500">{total} عطل</p>

      <FaultForm generators={generators.map((g) => ({ id: g.id, name: g.name }))} />

      <ul className="space-y-2">
        {items.map((fault) => (
          <li key={fault.id}>
            <Link
              href={`/app/faults/${fault.id}`}
              className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">{fault.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[fault.status]}`}>
                  {STATUS_LABEL[fault.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {fault.generator.name} · أولوية {PRIORITY_LABEL[fault.priority]}
              </p>
              <p className="text-xs text-gray-400">{new Date(fault.createdAt).toLocaleDateString("ar-IQ")}</p>
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا توجد أعطال مسجّلة
          </p>
        )}
      </ul>
    </div>
  );
}
