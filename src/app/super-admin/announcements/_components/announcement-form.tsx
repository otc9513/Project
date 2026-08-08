"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPlatformAnnouncementAction,
  updatePlatformAnnouncementAction,
  deletePlatformAnnouncementAction,
} from "@/features/platform-announcements/actions/platform-announcement.actions";

interface Values {
  id?: string;
  title: string;
  description: string;
  buttonText?: string | null;
  buttonUrl?: string | null;
  priority: number;
  startDate: string;
  endDate: string;
  allTenants: boolean;
  isActive?: boolean;
}

export function AnnouncementForm({ initial }: { initial?: Values }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>(
    initial ?? {
      title: "",
      description: "",
      priority: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      allTenants: true,
    }
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          title: values.title,
          description: values.description,
          buttonText: values.buttonText || undefined,
          buttonUrl: values.buttonUrl || undefined,
          priority: values.priority,
          startDate: new Date(values.startDate),
          endDate: values.endDate ? new Date(values.endDate) : null,
          visibility: { allTenants: values.allTenants, tenantIds: [], planIds: [] },
        };
        if (values.id) {
          await updatePlatformAnnouncementAction({ id: values.id, ...payload, isActive: values.isActive });
        } else {
          await createPlatformAnnouncementAction(payload);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <input
        placeholder="العنوان"
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <textarea
        placeholder="الوصف"
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        rows={3}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="نص الزر (اختياري)"
          value={values.buttonText ?? ""}
          onChange={(e) => setValues({ ...values, buttonText: e.target.value })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          placeholder="رابط الزر (اختياري)"
          value={values.buttonUrl ?? ""}
          onChange={(e) => setValues({ ...values, buttonUrl: e.target.value })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={values.startDate}
          onChange={(e) => setValues({ ...values, startDate: e.target.value })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={values.endDate}
          onChange={(e) => setValues({ ...values, endDate: e.target.value })}
          placeholder="تاريخ الانتهاء (اختياري)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.allTenants}
          onChange={(e) => setValues({ ...values, allTenants: e.target.checked })}
        />
        عرض لكل المستأجرين
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-between">
        <button
          disabled={isPending}
          onClick={submit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "جارٍ الحفظ..." : values.id ? "حفظ التعديلات" : "نشر الإعلان"}
        </button>
        {values.id && (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm("حذف هذا الإعلان؟")) {
                startTransition(async () => {
                  await deletePlatformAnnouncementAction(values.id!);
                  router.refresh();
                });
              }
            }}
            className="rounded-lg bg-danger/10 px-4 py-2 text-sm font-medium text-danger"
          >
            حذف
          </button>
        )}
      </div>
    </div>
  );
}
