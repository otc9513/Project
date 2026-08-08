"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordSaasPaymentAction,
  cancelSaasInvoiceAction,
} from "@/features/platform-billing/actions/platform-billing.actions";

const STATUS_LABEL: Record<string, string> = {
  UNPAID: "غير مدفوعة",
  PAID: "مدفوعة",
  OVERDUE: "متأخرة",
  CANCELLED: "ملغاة",
};
const STATUS_COLOR: Record<string, string> = {
  UNPAID: "bg-gray-200 text-gray-600",
  PAID: "bg-success/10 text-success",
  OVERDUE: "bg-danger/10 text-danger",
  CANCELLED: "bg-gray-200 text-gray-400",
};

export function SaasInvoiceRow({
  invoice,
}: {
  invoice: {
    id: string;
    amount: number;
    paidAmount: number;
    status: string;
    dueDate: string;
    tenantName: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(invoice.amount - invoice.paidAmount));

  return (
    <li className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{invoice.tenantName}</p>
          <p className="text-sm text-gray-500">
            {invoice.amount.toLocaleString("ar-IQ")} د.ع · مدفوع {invoice.paidAmount.toLocaleString("ar-IQ")}
          </p>
          <p className="text-xs text-gray-400">
            الاستحقاق: {new Date(invoice.dueDate).toLocaleDateString("ar-IQ")}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${STATUS_COLOR[invoice.status]}`}>
          {STATUS_LABEL[invoice.status]}
        </span>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
          />
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await recordSaasPaymentAction({ saasInvoiceId: invoice.id, amount: Number(amount) });
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "فشل تسجيل الدفعة");
                }
              })
            }
            className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            تسجيل دفعة
          </button>
          <button
            disabled={isPending}
            onClick={() => {
              const reason = prompt("سبب إلغاء الفاتورة؟");
              if (reason) {
                startTransition(async () => {
                  await cancelSaasInvoiceAction({ saasInvoiceId: invoice.id, reason });
                  router.refresh();
                });
              }
            }}
            className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger"
          >
            إلغاء
          </button>
        </div>
      )}
    </li>
  );
}
