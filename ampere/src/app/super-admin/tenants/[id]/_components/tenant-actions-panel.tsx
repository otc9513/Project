"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  suspendTenantAction,
  activateTenantAction,
  cancelTenantAction,
  deleteTenantAction,
  extendTenantSubscriptionAction,
  changeTenantPlanAction,
  setTenantFeatureOverrideAction,
} from "@/features/platform-tenants/actions/platform-tenant.actions";
import { generateSaasInvoiceAction } from "@/features/platform-billing/actions/platform-billing.actions";
import { FEATURE_REGISTRY } from "@/lib/features/feature-registry";

interface Props {
  tenantId: string;
  status: string;
  planId: string;
  plans: { id: string; nameAr: string }[];
  featureOverrides: Record<string, boolean>;
  planFeatures: Record<string, boolean>;
}

export function TenantActionsPanel({
  tenantId,
  status,
  planId,
  plans,
  featureOverrides,
  planFeatures,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [extendDays, setExtendDays] = useState("30");
  const [selectedPlan, setSelectedPlan] = useState(planId);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">حالة الاشتراك</p>
        <div className="flex flex-wrap gap-2">
          {status !== "ACTIVE" && (
            <button
              disabled={isPending}
              onClick={() => run(() => activateTenantAction({ tenantId }))}
              className="rounded-lg bg-success px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              تفعيل
            </button>
          )}
          {status !== "SUSPENDED" && (
            <button
              disabled={isPending || !reason}
              onClick={() => run(() => suspendTenantAction({ tenantId, reason }))}
              className="rounded-lg bg-warning px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              تعليق
            </button>
          )}
          {status !== "CANCELLED" && (
            <button
              disabled={isPending || !reason}
              onClick={() => {
                if (confirm("هل أنت متأكد من إلغاء اشتراك هذا المستأجر؟")) {
                  run(() => cancelTenantAction({ tenantId, reason }));
                }
              }}
              className="rounded-lg bg-gray-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              إلغاء نهائي
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="سبب التعليق/الإلغاء (إلزامي لهذين الإجراءين)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">تمديد الاشتراك</p>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
            className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <span className="self-center text-sm text-gray-500">يوم</span>
          <button
            disabled={isPending}
            onClick={() =>
              run(() =>
                extendTenantSubscriptionAction({ tenantId, days: Number(extendDays) })
              )
            }
            className="mr-auto rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            تمديد
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">تغيير الخطة</p>
        <div className="flex gap-2">
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
              </option>
            ))}
          </select>
          <button
            disabled={isPending || selectedPlan === planId}
            onClick={() => run(() => changeTenantPlanAction({ tenantId, planId: selectedPlan }))}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            تغيير
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">تجاوز الميزات لهذا المستأجر تحديدًا</p>
        <ul className="space-y-2">
          {FEATURE_REGISTRY.map((feature) => {
            const overridden = feature.key in featureOverrides;
            const effectiveValue = overridden
              ? featureOverrides[feature.key]
              : Boolean(planFeatures[feature.key]);
            return (
              <li key={feature.key} className="flex items-center justify-between text-sm">
                <div>
                  <p>{feature.labelAr}</p>
                  <p className="text-xs text-gray-400">
                    {overridden ? "مُتجاوَزة يدويًا" : "افتراضي الخطة"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    disabled={isPending}
                    onClick={() =>
                      run(() =>
                        setTenantFeatureOverrideAction({
                          tenantId,
                          featureKey: feature.key,
                          value: true,
                        })
                      )
                    }
                    className={`rounded-lg px-2 py-1 text-xs ${
                      overridden && effectiveValue
                        ? "bg-success text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    تفعيل
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() =>
                      run(() =>
                        setTenantFeatureOverrideAction({
                          tenantId,
                          featureKey: feature.key,
                          value: false,
                        })
                      )
                    }
                    className={`rounded-lg px-2 py-1 text-xs ${
                      overridden && !effectiveValue
                        ? "bg-danger text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    تعطيل
                  </button>
                  {overridden && (
                    <button
                      disabled={isPending}
                      onClick={() =>
                        run(() =>
                          setTenantFeatureOverrideAction({
                            tenantId,
                            featureKey: feature.key,
                            value: null,
                          })
                        )
                      }
                      className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      إعادة للافتراضي
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">فوترة SaaS</p>
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() =>
              run(() => generateSaasInvoiceAction({ tenantId, billingCycle: "MONTHLY" }))
            }
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            إصدار فاتورة شهرية
          </button>
          <button
            disabled={isPending}
            onClick={() =>
              run(() => generateSaasInvoiceAction({ tenantId, billingCycle: "YEARLY" }))
            }
            className="rounded-lg bg-primary/80 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            إصدار فاتورة سنوية
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          راجع صفحة «فوترة SaaS» لعرض الفواتير وتسجيل الدفعات.
        </p>
      </div>

      <div className="rounded-xl border border-danger/30 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium text-danger">منطقة الخطر</p>
        <p className="mb-3 text-xs text-gray-500">
          حذف المستأجر نهائي ويحذف كل بياناته (مشتركون، فواتير، دفعات...) بلا رجعة.
        </p>
        <button
          disabled={isPending}
          onClick={() => {
            if (
              confirm(
                "هل أنت متأكد تمامًا من حذف هذا المستأجر؟ لا يمكن التراجع عن هذا الإجراء إطلاقًا."
              )
            ) {
              run(async () => {
                await deleteTenantAction(tenantId);
                router.push("/super-admin/tenants");
              });
            }
          }}
          className="rounded-lg bg-danger px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          حذف المستأجر نهائيًا
        </button>
      </div>
    </div>
  );
}
