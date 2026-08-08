"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordFuelPurchaseAction,
  recordFuelUsageAction,
} from "@/features/fuel/actions/fuel.actions";

interface GeneratorOption {
  id: string;
  name: string;
}

export function FuelForm({ generators }: { generators: GeneratorOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"purchase" | "usage">("purchase");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generatorId, setGeneratorId] = useState(generators[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "purchase") {
          await recordFuelPurchaseAction({
            generatorId,
            quantityLiters: Number(quantity),
            price: Number(price),
            supplier: supplier || undefined,
            date: new Date(date),
          });
        } else {
          await recordFuelUsageAction({
            generatorId,
            quantityLiters: Number(quantity),
            date: new Date(date),
          });
        }
        setQuantity("");
        setPrice("");
        setSupplier("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
      }
    });
  }

  if (generators.length === 0) {
    return (
      <p className="mb-4 rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
        أضف مولدًا أولًا قبل تسجيل الوقود
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex overflow-hidden rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setMode("purchase")}
          className={`flex-1 py-2 text-sm font-medium ${mode === "purchase" ? "bg-primary text-white" : "bg-white text-gray-600"}`}
        >
          شراء وقود
        </button>
        <button
          type="button"
          onClick={() => setMode("usage")}
          className={`flex-1 py-2 text-sm font-medium ${mode === "usage" ? "bg-primary text-white" : "bg-white text-gray-600"}`}
        >
          تسجيل استهلاك
        </button>
      </div>

      <select
        value={generatorId}
        onChange={(e) => setGeneratorId(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base"
      >
        {generators.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          inputMode="decimal"
          placeholder="الكمية (لتر)"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-3 text-base"
          min="0"
          step="0.01"
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-3 text-base"
          required
        />
      </div>

      {mode === "purchase" && (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="السعر الإجمالي (د.ع)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-3 text-base"
            min="0"
            step="0.01"
            required
          />
          <input
            type="text"
            placeholder="المورّد (اختياري)"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-3 text-base"
          />
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ الحفظ..." : mode === "purchase" ? "+ تسجيل شراء" : "+ تسجيل استهلاك"}
      </button>
    </form>
  );
}
