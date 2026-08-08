import Link from "next/link";
import { listPlatformTenantsAction } from "@/features/platform-tenants/actions/platform-tenant.actions";

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "تجربة",
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  SUSPENDED: "معلَّق",
  CANCELLED: "ملغى",
};

const STATUS_COLOR: Record<string, string> = {
  TRIAL: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-success/10 text-success",
  EXPIRED: "bg-gray-200 text-gray-600",
  SUSPENDED: "bg-warning/10 text-warning",
  CANCELLED: "bg-danger/10 text-danger",
};

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { items, total, pageSize } = await listPlatformTenantsAction({
    search: params.q,
    status: params.status as never,
    page: params.page ? Number(params.page) : 1,
    pageSize: 20,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-xl font-bold">المستأجرون</h1>

      <form className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="ابحث بالاسم أو رابط المساحة أو بريد المالك..."
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-base"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-xl border border-gray-200 px-3 py-3 text-sm"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </form>

      <p className="mb-3 text-sm text-gray-500">{total} مستأجر</p>

      <ul className="space-y-2">
        {items.map((tenant) => {
          const owner = tenant.memberships[0]?.user;
          return (
            <li key={tenant.id}>
              <Link
                href={`/super-admin/tenants/${tenant.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-gray-500">
                    {owner?.name ?? owner?.email ?? "بلا مالك"} · {tenant.plan.nameAr}
                  </p>
                  <p className="text-xs text-gray-400">
                    {tenant._count.subscribers} مشترك · {tenant._count.generators} مولد
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[tenant.status]}`}
                >
                  {STATUS_LABEL[tenant.status]}
                </span>
              </Link>
            </li>
          );
        })}

        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا يوجد مستأجرون مطابقون
          </li>
        )}
      </ul>

      {total > pageSize && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/super-admin/tenants?q=${params.q ?? ""}&status=${params.status ?? ""}&page=${p}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5"
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
