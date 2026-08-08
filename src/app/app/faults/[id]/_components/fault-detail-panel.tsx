"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  updateFaultStatusAction,
  addFaultUpdateAction,
} from "@/features/faults/actions/fault.actions";

type FaultStatus = "NEW" | "IN_PROGRESS" | "COMPLETED";

const STATUS_ACTIONS: { status: FaultStatus; label: string }[] = [
  { status: "IN_PROGRESS", label: "بدء المعالجة" },
  { status: "COMPLETED", label: "إغلاق العطل" },
];

export function FaultDetailPanel({
  faultId,
  currentStatus,
  canManage,
}: {
  faultId: string;
  currentStatus: FaultStatus;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(status: FaultStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await updateFaultStatusAction({ id: faultId, status });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحديث الحالة");
      }
    });
  }

  function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addFaultUpdateAction({ faultId, note });
        setNote("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء إضافة الملاحظة");
      }
    });
  }

  return (
    <div className="space-y-3">
      {canManage && currentStatus !== "COMPLETED" && (
        <div className="flex gap-2">
          {STATUS_ACTIONS.filter((a) => a.status !== currentStatus).map((a) => (
            <button
              key={a.status}
              disabled={isPending}
              onClick={() => handleStatusChange(a.status)}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {canManage && (
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            placeholder="أضف تحديثًا/ملاحظة..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={isPending || !note.trim()}
            className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            إضافة
          </button>
        </form>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
