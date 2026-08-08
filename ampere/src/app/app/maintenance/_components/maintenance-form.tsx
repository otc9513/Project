"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMaintenanceAction } from "@/features/maintenance/actions/maintenance.actions";

interface GeneratorOption {
  id: string;
  name: string;
}

export function MaintenanceForm({ generators }: { generators: GeneratorOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generatorId, setGeneratorId] = useState(generators[0]?.id ?? "");
  const [type, setType] = useState("");
  const [cost, setCost] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createMaintenanceAction({
          generatorId,
          type,
          cost: Number(cost || 0),
          date: new Date(date),
          nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
          description: description || undefined,
        });
        setType("");
        setCost("");
        setNextDueDate("");
        setDescription("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
      }
    });
  }

  if (generators.length === 0) {
    return (
      <p className="mb-4 rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
        أضف مولدًا أولًا قبل تسجيل صيانة
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
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

      <input
        type="text"
        placeholder="نوع الصيانة (تغيير زيت، فلاتر، إصلاح...)"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          inputMode="decimal"
          placeholder="التكلفة (د.ع)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-3 text-base"
          min="0"
          step="0.01"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-3 text-base"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-gray-500">تاريخ الصيانة القادمة (اختياري)</label>
        <input
          type="date"
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base"
        />
      </div>

      <input
        type="text"
        placeholder="ملاحظات (اختياري)"
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
        {isPending ? "جارٍ الحفظ..." : "+ تسجيل صيانة"}
      </button>
    </form>
  );
}
