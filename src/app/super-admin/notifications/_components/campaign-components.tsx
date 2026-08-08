"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPlatformCampaignAction,
  sendPlatformCampaignAction,
  deletePlatformCampaignAction,
} from "@/features/platform-notifications/actions/platform-notification.actions";

const ROLES = [
  { value: "OWNER", label: "المالك" },
  { value: "ADMIN", label: "مدير" },
  { value: "ACCOUNTANT", label: "محاسب" },
  { value: "COLLECTOR", label: "محصّل" },
  { value: "TECHNICIAN", label: "فني" },
] as const;

type AudienceMode = "all" | "tenants" | "plans";
type RoleValue = (typeof ROLES)[number]["value"];

export function CampaignForm({
  tenants,
  plans,
}: {
  tenants: { id: string; name: string }[];
  plans: { id: string; nameAr: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<RoleValue[]>([]);

  function toggle<T extends string>(list: T[], value: T, setList: (v: T[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  // نفس شرط .refine() في createCampaignSchema على الخادم - نكرره هنا فقط
  // لإظهار رسالة فورية قبل الإرسال، وليس كمصدر التحقق الوحيد (الخادم
  // يتحقق دائمًا مجددًا بغض النظر عمّا يرسله العميل).
  const audienceIsEmpty =
    audienceMode === "tenants"
      ? selectedTenantIds.length === 0
      : audienceMode === "plans"
        ? selectedPlanIds.length === 0
        : false;

  function submit() {
    setError(null);
    if (audienceIsEmpty) {
      setError("حدّد مستأجرًا واحدًا على الأقل أو خطة واحدة على الأقل");
      return;
    }

    startTransition(async () => {
      try {
        await createPlatformCampaignAction({
          title,
          message,
          actionUrl: actionUrl || undefined,
          audience: {
            allUsers: audienceMode === "all",
            tenantIds: audienceMode === "tenants" ? selectedTenantIds : [],
            planIds: audienceMode === "plans" ? selectedPlanIds : [],
            roles: selectedRoles,
          },
        });
        setTitle("");
        setMessage("");
        setActionUrl("");
        setAudienceMode("all");
        setSelectedTenantIds([]);
        setSelectedPlanIds([]);
        setSelectedRoles([]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء الحملة");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <input
        placeholder="عنوان الإشعار"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <textarea
        placeholder="نص الرسالة"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        placeholder="رابط الإجراء عند الضغط (اختياري)"
        value={actionUrl}
        onChange={(e) => setActionUrl(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />

      <div className="space-y-2 rounded-lg border border-gray-100 p-3">
        <p className="text-xs font-medium text-gray-500">الجمهور المستهدَف</p>
        <div className="flex gap-2">
          {(
            [
              ["all", "كل المستخدمين"],
              ["tenants", "مستأجرون محددون"],
              ["plans", "خطط محددة"],
            ] as [AudienceMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAudienceMode(mode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                audienceMode === mode
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {audienceMode === "tenants" && (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
            {tenants.length === 0 && (
              <p className="text-xs text-gray-400">لا يوجد مستأجرون</p>
            )}
            {tenants.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedTenantIds.includes(t.id)}
                  onChange={() => toggle(selectedTenantIds, t.id, setSelectedTenantIds)}
                />
                {t.name}
              </label>
            ))}
          </div>
        )}

        {audienceMode === "plans" && (
          <div className="space-y-1 rounded-lg border border-gray-100 p-2">
            {plans.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedPlanIds.includes(p.id)}
                  onChange={() => toggle(selectedPlanIds, p.id, setSelectedPlanIds)}
                />
                {p.nameAr}
              </label>
            ))}
          </div>
        )}

        <div>
          <p className="mb-1 text-xs text-gray-400">
            تضييق إضافي حسب الدور (اختياري - فوق الاختيار أعلاه):
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(r.value)}
                  onChange={() => toggle(selectedRoles, r.value, setSelectedRoles)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        disabled={isPending || !title || !message || audienceIsEmpty}
        onClick={submit}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ الإنشاء..." : "إنشاء الحملة كمسوّدة"}
      </button>
    </div>
  );
}

export function CampaignRow({
  campaign,
}: {
  campaign: {
    id: string;
    title: string;
    message: string;
    status: string;
    stats: { recipients: number; delivered: number; failed: number } | null;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const STATUS_LABEL: Record<string, string> = {
    DRAFT: "مسوّدة",
    SCHEDULED: "مجدولة",
    SENT: "أُرسلت",
    FAILED: "فشلت",
  };

  return (
    <li className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{campaign.title}</p>
          <p className="text-sm text-gray-500">{campaign.message}</p>
          {campaign.stats && (
            <p className="mt-1 text-xs text-gray-400">
              وُصلت لـ {campaign.stats.delivered} من {campaign.stats.recipients} (فشل:{" "}
              {campaign.stats.failed})
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs">
          {STATUS_LABEL[campaign.status]}
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {campaign.status !== "SENT" && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await sendPlatformCampaignAction(campaign.id);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "فشل الإرسال");
                }
              })
            }
            className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            إرسال الآن
          </button>
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await deletePlatformCampaignAction(campaign.id);
                router.refresh();
              })
            }
            className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger"
          >
            حذف
          </button>
        </div>
      )}
    </li>
  );
}
