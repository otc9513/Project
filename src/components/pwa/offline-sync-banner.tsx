"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { countPendingPayments } from "@/lib/offline/db";
import { syncPendingPayments, type SyncResult } from "@/lib/offline/sync-pending-payments";

/**
 * مكوّن عام يُركَّب مرة واحدة في تخطيط `/app` (وليس داخل صفحة التحصيل فقط)
 * لأن مستخدمًا قد يُسجّل دفعات في `/app/collection` أثناء انقطاع الاتصال ثم
 * يتنقّل لصفحة أخرى قبل عودته - يجب أن تُزامَن الدفعات المعلَّقة بغضّ النظر
 * عن الصفحة التي يظهر فيها.
 */
export function OfflineSyncBanner() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  async function refreshPendingCount() {
    try {
      setPendingCount(await countPendingPayments());
    } catch {
      // IndexedDB قد يفشل في وضع التصفح الخاص ببعض المتصفحات - تجاهل بصمت
    }
  }

  useEffect(() => {
    refreshPendingCount();
  }, []);

  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;
    setIsSyncing(true);
    syncPendingPayments()
      .then((result) => {
        if (cancelled) return;
        setLastResult(result);
        if (result.synced.length > 0) {
          router.refresh();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSyncing(false);
          refreshPendingCount();
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (isOnline && pendingCount === 0 && !lastResult) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex flex-col gap-1 px-3 pt-3">
      {!isOnline && (
        <div className="rounded-lg bg-gray-800 px-3 py-2 text-center text-xs font-medium text-white shadow">
          أنت غير متصل بالإنترنت — العمليات المسجَّلة الآن ستُزامَن تلقائيًا
          عند عودة الاتصال
        </div>
      )}
      {isOnline && isSyncing && (
        <div className="rounded-lg bg-primary px-3 py-2 text-center text-xs font-medium text-white shadow">
          جارٍ مزامنة {pendingCount} عملية معلَّقة...
        </div>
      )}
      {isOnline && !isSyncing && lastResult && lastResult.synced.length > 0 && (
        <div className="rounded-lg bg-success px-3 py-2 text-center text-xs font-medium text-white shadow">
          تمت مزامنة {lastResult.synced.length} دفعة بنجاح
        </div>
      )}
      {isOnline && !isSyncing && lastResult && lastResult.conflicted.length > 0 && (
        <div className="rounded-lg bg-danger px-3 py-2 text-center text-xs font-medium text-white shadow">
          تعذّرت مزامنة {lastResult.conflicted.length} عملية — راجع صفحة
          التحصيل لحلّها يدويًا
        </div>
      )}
    </div>
  );
}
