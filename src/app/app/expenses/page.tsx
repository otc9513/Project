import { listExpensesAction } from "@/features/expenses/actions/expense.actions";
import { ExpenseForm } from "./_components/expense-form";

const CATEGORY_LABEL: Record<string, string> = {
  FUEL: "وقود",
  MAINTENANCE: "صيانة",
  SPARE_PARTS: "قطع غيار",
  SALARIES: "رواتب",
  OTHER: "أخرى",
};

const numberFormatter = new Intl.NumberFormat("ar-IQ");

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const { items, total, totalAmount } = await listExpensesAction({
    category: params.category as never,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">المصاريف</h1>
      <p className="mb-4 text-sm text-gray-500">
        {total} مصروف · إجمالي {numberFormatter.format(Number(totalAmount))} د.ع
      </p>

      <ExpenseForm />

      <ul className="space-y-2">
        {items.map((expense) => (
          <li
            key={expense.id}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium">{CATEGORY_LABEL[expense.category]}</p>
              {expense.description && (
                <p className="text-sm text-gray-500">{expense.description}</p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(expense.date).toLocaleDateString("ar-IQ")}
              </p>
            </div>
            <p className="font-bold text-danger">
              {numberFormatter.format(Number(expense.amount))} د.ع
            </p>
          </li>
        ))}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا توجد مصاريف مسجّلة بعد
          </p>
        )}
      </ul>
    </div>
  );
}
