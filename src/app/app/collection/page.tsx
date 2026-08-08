import { listUnpaidSubscribersAction } from "@/features/collection/actions/collection.actions";
import { PaymentButton } from "./_components/payment-button";

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const { items, total } = await listUnpaidSubscribersAction({ search: params.q });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">التحصيل</h1>
      <p className="mb-4 text-sm text-gray-500">{total} مشترك عليهم مبالغ مستحقة</p>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="ابحث عن مشترك..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
        />
      </form>

      <ul className="space-y-2">
        {items.map((subscriber) => {
          const invoice = subscriber.invoices[0];
          const remaining = invoice
            ? Number(invoice.amount) - Number(invoice.paidAmount)
            : 0;

          return (
            <li
              key={subscriber.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{subscriber.fullName}</p>
                  <p className="text-sm text-gray-500" dir="ltr">
                    {subscriber.phone}
                  </p>
                </div>
                <p className="text-lg font-bold text-danger">
                  {remaining.toLocaleString("ar-IQ")} د.ع
                </p>
              </div>

              {invoice && (
                <PaymentButton
                  invoiceId={invoice.id}
                  maxAmount={remaining}
                  subscriberName={subscriber.fullName}
                />
              )}
            </li>
          );
        })}

        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا توجد مبالغ مستحقة حاليًا 🎉
          </li>
        )}
      </ul>
    </div>
  );
}
