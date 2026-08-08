import { listSaasInvoicesAction } from "@/features/platform-billing/actions/platform-billing.actions";
import { SaasInvoiceRow } from "./_components/saas-invoice-row";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { items, total } = await listSaasInvoicesAction({
    status: params.status as never,
    page: params.page ? Number(params.page) : 1,
    pageSize: 30,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">فوترة SaaS</h1>
      <p className="mb-4 text-sm text-gray-500">
        اشتراك المستأجرين بالمنصة نفسها. لإصدار فاتورة جديدة، افتح صفحة المستأجر المعني.
      </p>
      <p className="mb-3 text-sm text-gray-500">{total} فاتورة</p>

      <ul className="space-y-2">
        {items.map((inv) => (
          <SaasInvoiceRow
            key={inv.id}
            invoice={{
              id: inv.id,
              amount: Number(inv.amount),
              paidAmount: Number(inv.paidAmount),
              status: inv.status,
              dueDate: inv.dueDate.toISOString(),
              tenantName: inv.tenant.name,
            }}
          />
        ))}
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا توجد فواتير بعد
          </li>
        )}
      </ul>
    </div>
  );
}
