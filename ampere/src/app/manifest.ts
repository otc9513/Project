import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * اصطلاح Next.js الأصلي لملفات المانيفست الديناميكية (App Router) - يُخدَّم
 * تلقائيًا على `/manifest.webmanifest` ويُدرَج تلقائيًا كـ
 * <link rel="manifest"> في <head> (راجع layout.tsx حيث ضُبط
 * metadata.manifest صراحة على نفس المسار للتأكيد).
 *
 * يحل هذا محل public/manifest.json الثابت سابقًا، والذي كان يُشير دائمًا
 * لنفس الأيقونات الافتراضية الأربع بلا أي وعي بالبراندنغ المخصَّص الذي
 * يرفعه Super Admin (المشكلة الموصوفة في المرحلة 4 من البرومبت).
 *
 * الأيقونات نفسها لا تُخزَّن هنا كملفات جاهزة بعدة مقاسات؛ تُشتَق حيًّا من
 * الشعار الأصلي المرفوع عبر `/api/branding/icon/[size]` (راجع التعليق
 * هناك) - أو تسقط تلقائيًا للأيقونات الثابتة الافتراضية إن لم يُرفَع شعار
 * مخصَّص أصلاً، فتبقى تجربة PWA سليمة دائمًا.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [settings, pwaIcon] = await Promise.all([
    prisma.platformSettings.findUnique({ where: { id: "singleton" } }),
    prisma.brandAsset.findUnique({ where: { type: "PWA_ICON" } }),
  ]);

  const name = settings?.platformNameAr ?? "أمبير — إدارة المولدات الأهلية";
  const shortName = settings?.platformNameAr ?? "أمبير";
  const themeColor = settings?.primaryColor ?? "#0EA5E9";

  // نسخة الأيقونة تُضاف كـ query param مبني على وقت آخر تحديث للشعار
  // (وليس Math.random أو Date.now عند كل طلب) حتى يُبطِل المتصفح/الـ CDN
  // الكاش تلقائيًا فقط عند رفع شعار جديد فعليًا، لا في كل تحميل.
  const iconVersion = pwaIcon ? new Date(pwaIcon.updatedAt).getTime() : 0;
  const iconUrl = (size: 192 | 512, maskable: boolean) =>
    `/api/branding/icon/${size}${maskable ? "?maskable=1" : "?maskable=0"}&v=${iconVersion}`;

  return {
    name,
    short_name: shortName,
    description:
      settings?.metaDescription ??
      "منصة SaaS لإدارة المولدات الأهلية: مشتركون، فوترة، تحصيل ميداني، صيانة وأعطال.",
    start_url: "/app",
    id: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: themeColor,
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: iconUrl(192, false), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconUrl(512, false), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconUrl(192, true), sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: iconUrl(512, true), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "التحصيل",
        short_name: "التحصيل",
        url: "/app/collection",
        icons: [{ src: iconUrl(192, false), sizes: "192x192" }],
      },
      {
        name: "الأعطال",
        short_name: "الأعطال",
        url: "/app/faults",
        icons: [{ src: iconUrl(192, false), sizes: "192x192" }],
      },
    ],
  };
}
