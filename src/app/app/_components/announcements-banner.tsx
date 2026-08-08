"use client";

import { useEffect, useState } from "react";

interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
}

const DISMISS_STORAGE_PREFIX = "ampere:announcement-dismissed:";

/**
 * يستقبل قائمة الإعلانات المرئية لهذا المستأجر (جُلبت في layout.tsx عبر
 * `platformAnnouncementService.listVisibleForCurrentTenant()` - راجع
 * التعليق هناك) ويتولى فقط منطق الإخفاء المؤقت من طرف العميل.
 *
 * قرار مقصود: لا يوجد في المخطط الحالي (Announcement model) أي حقل لحالة
 * "قراءة/إخفاء" محفوظة في قاعدة البيانات لكل مستخدم، والمواصفات تطلب
 * صراحةً عدم اختراع نظام جديد معقّد إن لم يوجد أصلاً. الإخفاء هنا محلي
 * بالمتصفح (localStorage) فقط - يعاود الظهور على جهاز آخر أو بعد مسح
 * بيانات المتصفح، وهذا سلوك مقبول لإعلانات تسويقية/تنبيهية وليست حرجة.
 */
export function AnnouncementsBanner({ announcements }: { announcements: AnnouncementItem[] }) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const dismissed = announcements
      .filter((a) => localStorage.getItem(DISMISS_STORAGE_PREFIX + a.id) === "1")
      .map((a) => a.id);
    setDismissedIds(new Set(dismissed));
    setHydrated(true);
  }, [announcements]);

  function dismiss(id: string) {
    localStorage.setItem(DISMISS_STORAGE_PREFIX + id, "1");
    setDismissedIds((prev) => new Set(prev).add(id));
  }

  // قبل اكتمال hydration نتجنب أي وميض (إظهار ثم إخفاء فوري) بعدم عرض شيء
  if (!hydrated) return null;

  const visible = announcements.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3"
        >
          <div className="flex flex-1 items-start gap-3">
            {a.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.imageUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800">{a.title}</p>
              <p className="mt-0.5 text-xs text-gray-600">{a.description}</p>
              {a.buttonText && a.buttonUrl ? (
                <a
                  href={a.buttonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white"
                >
                  {a.buttonText}
                </a>
              ) : null}
            </div>
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-gray-400"
            aria-label="إخفاء الإعلان"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
