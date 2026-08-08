"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPlatformPlanAction,
  updatePlatformPlanAction,
  deactivatePlatformPlanAction,
} from "@/features/platform-plans/actions/platform-plan.actions";
import { FEATURE_REGISTRY } from "@/lib/features/feature-registry";

interface PlanFormValues {
  id?: string;
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly?: number | null;
  trialDays: number;
  maxGenerators?: number | null;
  maxSubscribers?: number | null;
  maxEmployees?: number | null;
  features: Record<string, boolean>;
  sortOrder: number;
}

export function PlanForm({ initial }: { initial?: PlanFormValues }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<PlanFormValues>(
    initial ?? {
      name: "",
      nameAr: "",
      priceMonthly: 0,
      priceYearly: null,
      trialDays: 0,
      features: Object.fromEntries(FEATURE_REGISTRY.map((f) => [f.key, false])),
      sortOrder: 0,
    }
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (values.id) {
          await updatePlatformPlanAction(values as never);
        } else {
          await createPlatformPlanAction(values as never);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الخطة");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="الاسم (إنجليزي، فريد)"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          placeholder="الاسم بالعربية"
          value={values.nameAr}
          onChange={(e) => setValues({ ...values, nameAr: e.target.value })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="السعر الشهري"
          value={values.priceMonthly}
          onChange={(e) => setValues({ ...values, priceMonthly: Number(e.target.value) })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="السعر السنوي (اختياري)"
          value={values.priceYearly ?? ""}
          onChange={(e) =>
            setValues({ ...values, priceYearly: e.target.value ? Number(e.target.value) : null })
          }
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="أيام التجربة المجانية"
          value={values.trialDays}
          onChange={(e) => setValues({ ...values, trialDays: Number(e.target.value) })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="ترتيب العرض"
          value={values.sortOrder}
          onChange={(e) => setValues({ ...values, sortOrder: Number(e.target.value) })}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="حد أقصى للمولدات (اختياري)"
          value={values.maxGenerators ?? ""}
          onChange={(e) =>
            setValues({ ...values, maxGenerators: e.target.value ? Number(e.target.value) : null })
          }
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="حد أقصى للمشتركين (اختياري)"
          value={values.maxSubscribers ?? ""}
          onChange={(e) =>
            setValues({ ...values, maxSubscribers: e.target.value ? Number(e.target.value) : null })
          }
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-500">الميزات المتضمَّنة</p>
        <div className="grid grid-cols-2 gap-2">
          {FEATURE_REGISTRY.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(values.features[f.key])}
                onChange={(e) =>
                  setValues({
                    ...values,
                    features: { ...values.features, [f.key]: e.target.checked },
                  })
                }
              />
              {f.labelAr}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-between">
        <button
          disabled={isPending}
          onClick={submit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "جارٍ الحفظ..." : values.id ? "حفظ التعديلات" : "إنشاء الخطة"}
        </button>
        {values.id && (
          <button
            disabled={isPending}
            onClick={() => {
              if (confirm("تعطيل هذه الخطة يمنع اشتراك مستأجرين جدد بها. متابعة؟")) {
                startTransition(async () => {
                  await deactivatePlatformPlanAction(values.id!);
                  router.refresh();
                });
              }
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600"
          >
            تعطيل الخطة
          </button>
        )}
      </div>
    </div>
  );
}
