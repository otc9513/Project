"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction } from "@/features/expenses/actions/expense.actions";

const CATEGORY_OPTIONS = [
  { value: "FUEL", label: "وقود" },
  { value: "MAINTENANCE", label: "صيانة" },
  { value: "SPARE_PARTS", label: "قطع غيار" },
  { value: "SALARIES", label: "رواتب" },
  { value: "OTHER", label: "أخرى" },
];

export function ExpenseForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("OTHER");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createExpenseAction({
          category: category as never,
          amount: Number(amount),
          date: new Date(date),
          description: description || undefined,
        });
        setAmount("");
        setDescription("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المصروف");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-3 text-base"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-3 text-base"
          required
        />
      </div>
      <input
        type="number"
        inputMode="decimal"
        placeholder="المبلغ (د.ع)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
        min="0"
        step="0.01"
        required
      />
      <input
        type="text"
        placeholder="الوصف (اختياري)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ الحفظ..." : "+ إضافة مصروف"}
      </button>
    </form>
  );
}
