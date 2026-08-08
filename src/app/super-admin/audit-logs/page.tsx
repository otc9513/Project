import { listPlatformAuditLogAction } from "@/features/platform-audit/actions/platform-audit.actions";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { items, total, pageSize } = await listPlatformAuditLogAction({
    action: params.action,
    page: params.page ? Number(params.page) : 1,
    pageSize: 40,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-bold">سجل التدقيق</h1>

      <form className="mb-4">
        <input
          type="search"
          name="action"
          defaultValue={params.action}
          placeholder="ابحث باسم الإجراء (مثال: tenant.suspended)..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
        />
      </form>

      <p className="mb-3 text-sm text-gray-500">{total} سجل</p>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="p-3 text-right">الوقت</th>
              <th className="p-3 text-right">الفاعل</th>
              <th className="p-3 text-right">الإجراء</th>
              <th className="p-3 text-right">المستأجر المستهدَف</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-b border-gray-50 last:border-0">
                <td className="p-3 text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString("ar-IQ")}
                </td>
                <td className="p-3">{log.user?.name ?? log.user?.email ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3 text-xs text-gray-500">{log.tenant?.name ?? "—"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-gray-400">
                  لا توجد سجلات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/super-admin/audit-logs?action=${params.action ?? ""}&page=${p}`}
              className="rounded-lg border border-gray-200 px-3 py-1.5"
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
