"use client";

import { useState, useTransition } from "react";
import { recordPaymentAction } from "@/features/collection/actions/collection.actions";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { enqueuePendingPayment } from "@/lib/offline/db";

export function PaymentButton({
  invoiceId,
  maxAmount,
  subscriberName,
}: {
  invoiceId: string;
  maxAmount: number;
  subscriberName: string;
}) {
  const isOnline = useOnlineStatus();
  const [isPartial, setIsPartial] = useState(false);
  const [amount, setAmount] = useState(maxAmount);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);

  function handlePay(payAmount: number) {
    setError(null);

    // فحص الاتصال هنا "متفائل": حتى لو أظهر navigator.onLine أنه متصل،
    // قد يفشل الطلب الفعلي (نفق Wi-Fi ضعيف، انقطاع مفاجئ) - أي فشل شبكة
    // حقيقي أثناء الإرسال يُعامَل أيضًا كـ"غير متصل" ويُحفَظ محليًا بدل
    // ضياع الدفعة على المحصّل.
    if (!isOnline) {
      queueOffline(payAmount);
      return;
    }

    startTransition(async () => {
      try {
        await recordPaymentAction({ invoiceId, amount: payAmount });
        setSuccess(true);
      } catch (e) {
        if (e instanceof TypeError) {
          // فشل الشبكة (fetch) وليس رفضًا من الخادم (مثال: تجاوز المبلغ) -
          // هذا النوع فقط هو ما يُبرِّر التخزين المحلي التلقائي.
          queueOffline(payAmount);
          return;
        }
        setError(e instanceof Error ? e.message : "حدث خطأ أثناء تسجيل الدفعة");
      }
    });
  }

  function queueOffline(payAmount: number) {
    startTransition(async () => {
      await enqueuePendingPayment({ invoiceId, amount: payAmount, subscriberName });
      setQueuedOffline(true);
    });
  }

  if (success) {
    return (
      <p className="rounded-lg bg-success/10 py-2.5 text-center text-sm font-medium text-success">
        ✓ تم تسجيل الدفعة
      </p>
    );
  }

  if (queuedOffline) {
    return (
      <p className="rounded-lg bg-warning/10 py-2.5 text-center text-sm font-medium text-warning">
        ⏳ سُجِّلت محليًا — ستُزامَن تلقائيًا عند عودة الاتصال
      </p>
    );
  }

  if (isPartial) {
    return (
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          max={maxAmount}
          min={1}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-28 rounded-lg border border-gray-200 px-3 py-2.5 text-center"
        />
        <button
          disabled={isPending || amount <= 0 || amount > maxAmount}
          onClick={() => handlePay(amount)}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "جارٍ التسجيل..." : "تأكيد الدفعة الجزئية"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!isOnline && (
        <p className="text-xs font-medium text-warning">
          غير متصل — سيُحفَظ التسجيل محليًا ويُزامَن لاحقًا
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => handlePay(maxAmount)}
          className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "جارٍ التسجيل..." : "تسجيل كامل المبلغ"}
        </button>
        <button
          disabled={isPending}
          onClick={() => setIsPartial(true)}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium"
        >
          جزئي
        </button>
      </div>
    </div>
  );
}
