"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePlatformSettingsAction,
  uploadBrandAssetAction,
} from "@/features/platform-settings/actions/platform-settings.actions";
import { BRAND_ASSET_TYPES } from "@/features/platform-settings/schema/platform-settings.schema";

const ASSET_LABELS: Record<(typeof BRAND_ASSET_TYPES)[number], string> = {
  MAIN_LOGO: "الشعار الرئيسي",
  SIDEBAR_LOGO: "شعار القائمة الجانبية",
  SMALL_LOGO: "شعار مصغَّر",
  LOGIN_LOGO: "شعار صفحة الدخول",
  FAVICON: "أيقونة المتصفح (Favicon)",
  PWA_ICON: "أيقونة تطبيق PWA",
  SPLASH_ICON: "أيقونة شاشة البدء",
  SOCIAL_SHARE_IMAGE: "صورة المشاركة على السوشيال ميديا",
};

interface Props {
  settings: {
    platformNameAr: string;
    platformNameEn: string;
    companyName: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    websiteUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
    arabicFont: string | null;
    englishFont: string | null;
  };
  assets: { type: string; url: string }[];
}

export function BrandingSettingsForm({ settings, assets }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState(settings);

  const assetByType = Object.fromEntries(assets.map((a) => [a.type, a.url]));

  function saveSettings() {
    setError(null);
    startTransition(async () => {
      try {
        await updatePlatformSettingsAction(values);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
      }
    });
  }

  function uploadAsset(type: string, file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("type", type);
        fd.set("file", file);
        await uploadBrandAssetAction(fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ أثناء رفع الملف");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">الأصول البصرية</p>
        <div className="grid grid-cols-2 gap-3">
          {BRAND_ASSET_TYPES.map((type) => (
            <div key={type} className="rounded-lg border border-gray-100 p-2 text-center">
              {assetByType[type] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetByType[type]} alt={type} className="mx-auto mb-2 h-10 object-contain" />
              ) : (
                <div className="mb-2 h-10 rounded bg-gray-50" />
              )}
              <p className="mb-1 text-xs text-gray-500">{ASSET_LABELS[type]}</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => e.target.files?.[0] && uploadAsset(type, e.target.files[0])}
                className="w-full text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">اسم المنصة والتواصل</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="اسم المنصة (عربي)"
            value={values.platformNameAr}
            onChange={(e) => setValues({ ...values, platformNameAr: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="اسم المنصة (إنجليزي)"
            value={values.platformNameEn}
            onChange={(e) => setValues({ ...values, platformNameEn: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="بريد الدعم"
            value={values.supportEmail ?? ""}
            onChange={(e) => setValues({ ...values, supportEmail: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="هاتف الدعم"
            value={values.supportPhone ?? ""}
            onChange={(e) => setValues({ ...values, supportPhone: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">الألوان</p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["primaryColor", "أساسي"],
              ["secondaryColor", "ثانوي"],
              ["accentColor", "مميَّز"],
              ["successColor", "نجاح"],
              ["warningColor", "تحذير"],
              ["errorColor", "خطأ"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="text-center">
              <input
                type="color"
                value={values[key]}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                className="h-10 w-full rounded-lg border border-gray-200"
              />
              <p className="mt-1 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        disabled={isPending}
        onClick={saveSettings}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
      </button>
    </div>
  );
}
