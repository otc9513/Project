"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFaultAction } from "@/features/faults/actions/fault.actions";

interface GeneratorOption {
  id: string;
  name: string;
}

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "منخفضة" },
  { value: "MEDIUM", label: "متوسطة" },
  { value: "HIGH", label: "عالية" },
  { value: "CRITICAL", label: "حرجة" },
];

export function FaultForm({ generators }: { generators: GeneratorOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generatorId, setGeneratorId] = useState(generators[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createFaultAction({
          generatorId,
          title,
          priority: priority as never,
          description: description || undefined,
        });
        setTitle("");
        setDescription("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء الإبلاغ عن العطل");
      }
    });
  }

  if (generators.length === 0) {
    return (
      <p className="mb-4 rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
        أضف مولدًا أولًا قبل الإبلاغ عن عطل
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
        placeholder="عنوان العطل"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
        required
      />

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <textarea
        placeholder="وصف العطل (اختياري)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
        rows={3}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-danger py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ الإرسال..." : "+ الإبلاغ عن عطل"}
      </button>
    </form>
  );
}
