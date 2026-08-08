"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateMonthlyInvoicesAction } from "@/features/billing/actions/billing.actions";

export function GenerateInvoicesButton({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ generatedCount: number; skippedCount: number } | null>(
    null
  );

  function handleGenerate() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await generateMonthlyInvoicesAction({ month, year, dueInDays: 10 });
        setResult(res);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذّر توليد الفواتير");
      }
    });
  }

  return (
    <div className="mb-4">
      <button
        disabled={isPending}
        onClick={handleGenerate}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ التوليد..." : "توليد فواتير هذا الشهر لكل المشتركين النشطين"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {result && (
        <p className="mt-2 text-sm text-success">
          تم توليد {result.generatedCount} فاتورة (تم تخطي {result.skippedCount} لديهم فاتورة
          مسبقًا أو لا يملكون اشتراكًا نشطًا)
        </p>
      )}
    </div>
  );
}
