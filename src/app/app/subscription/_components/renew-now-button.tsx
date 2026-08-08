"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renewMySubscriptionAction } from "@/features/platform-billing/actions/tenant-billing.actions";
import type { BillingCycle } from "@prisma/client";

export function RenewNowButton({ defaultCycle }: { defaultCycle: BillingCycle | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle ?? "MONTHLY");

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await renewMySubscriptionAction(cycle);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذّر إنشاء فاتورة التجديد");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(["MONTHLY", "YEARLY"] as BillingCycle[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              cycle === c ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {c === "MONTHLY" ? "شهري" : "سنوي"}
          </button>
        ))}
      </div>
      <button
        disabled={isPending}
        onClick={submit}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ الإنشاء..." : "تجديد الآن"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-gray-400">
        سيتم إنشاء فاتورة تجديد جديدة. الدفع يتم حاليًا خارج النظام (تحويل/نقدًا) -
        تواصل مع الدعم لإتمام الدفع، وسيُفعَّل اشتراكك فور تسجيله.
      </p>
    </div>
  );
}
