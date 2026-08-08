"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelInvoiceAction } from "@/features/billing/actions/billing.actions";

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-danger underline underline-offset-2"
      >
        إلغاء الفاتورة
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-danger/20 bg-danger/5 p-2">
      <input
        type="text"
        placeholder="سبب الإلغاء (إلزامي)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={isPending || reason.trim().length < 3}
          onClick={() =>
            startTransition(async () => {
              try {
                await cancelInvoiceAction({ invoiceId, reason: reason.trim() });
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "تعذّر إلغاء الفاتورة");
              }
            })
          }
          className="flex-1 rounded-lg bg-danger py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
        >
          تراجع
        </button>
      </div>
    </div>
  );
}
