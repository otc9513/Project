import Link from "next/link";
import { listSubscribersAction } from "@/features/subscribers/actions/subscriber.actions";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "نشط",
  SUSPENDED: "موقوف",
  CANCELLED: "ملغى",
  DEBT: "متأخر بالدفع",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success",
  SUSPENDED: "bg-warning/10 text-warning",
  CANCELLED: "bg-gray-200 text-gray-600",
  DEBT: "bg-danger/10 text-danger",
};

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { items, total } = await listSubscribersAction({
    search: params.q,
    status: params.status as never,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">المشتركون</h1>
        <Link
          href="/app/subscribers/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          + إضافة مشترك
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="ابحث بالاسم أو الهاتف أو رقم الاشتراك..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
        />
      </form>

      <p className="mb-3 text-sm text-gray-500">{total} مشترك</p>

      <ul className="space-y-2">
        {items.map((subscriber) => (
          <li key={subscriber.id}>
            <Link
              href={`/app/subscribers/${subscriber.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50"
            >
              <div>
                <p className="font-medium">{subscriber.fullName}</p>
                <p className="text-sm text-gray-500" dir="ltr">
                  {subscriber.phone}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[subscriber.status]}`}
              >
                {STATUS_LABEL[subscriber.status]}
              </span>
            </Link>
          </li>
        ))}

        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا يوجد مشتركون مطابقون
          </li>
        )}
      </ul>
    </div>
  );
}
