import { notFound } from "next/navigation";
import { getFaultAction } from "@/features/faults/actions/fault.actions";
import { requireTenantContext } from "@/lib/tenant/context";
import { FaultDetailPanel } from "./_components/fault-detail-panel";

const STATUS_LABEL: Record<string, string> = {
  NEW: "جديد",
  IN_PROGRESS: "قيد المعالجة",
  COMPLETED: "مكتمل",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  CRITICAL: "حرجة",
};

const MANAGE_ROLES = ["OWNER", "ADMIN", "TECHNICIAN"];

export default async function FaultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenantContext();

  let fault;
  try {
    fault = await getFaultAction(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">{fault.title}</h1>
      <p className="mb-1 text-sm text-gray-500">
        {fault.generator.name} · أولوية {PRIORITY_LABEL[fault.priority]} · {STATUS_LABEL[fault.status]}
      </p>
      {fault.description && <p className="mb-4 text-sm text-gray-700">{fault.description}</p>}

      <div className="mb-4">
        <FaultDetailPanel
          faultId={fault.id}
          currentStatus={fault.status}
          canManage={MANAGE_ROLES.includes(ctx.role)}
        />
      </div>

      <h2 className="mb-2 text-sm font-bold text-gray-700">سجل التحديثات</h2>
      <ul className="space-y-2">
        {fault.updates.map((u) => (
          <li key={u.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-sm">{u.note}</p>
            <p className="mt-1 text-xs text-gray-400">
              {u.user.name ?? u.user.email} · {new Date(u.createdAt).toLocaleString("ar-IQ")}
            </p>
          </li>
        ))}
        {fault.updates.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            لا توجد تحديثات بعد
          </p>
        )}
      </ul>
    </div>
  );
}
