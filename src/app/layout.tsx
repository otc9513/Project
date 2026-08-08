import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import "./globals.css";

// الـ layout الجذري يقرأ البراندنغ الحي (Favicon، أيقونة PWA، اسم
// المنصة) من قاعدة البيانات في generateMetadata لكل صفحة في التطبيق -
// بما فيها الصفحات العامة مثل /login التي لا تقع تحت app/layout.tsx أو
// super-admin/layout.tsx. لنفس السبب الموثَّق هناك، يجب ألا يُجمَّد أي
// شيء هنا وقت البناء.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, brandAssets] = await Promise.all([
    prisma.platformSettings.findUnique({ where: { id: "singleton" } }),
    prisma.brandAsset.findMany({ where: { type: { in: ["FAVICON", "PWA_ICON"] } } }),
  ]);

  const favicon = brandAssets.find((a) => a.type === "FAVICON")?.url;
  const hasPwaIcon = brandAssets.some((a) => a.type === "PWA_ICON");

  // المرحلة 4 (براندنغ ديناميكي): إن رفع Super Admin أيقونة PWA مخصَّصة،
  // نستخدمها أيضًا كأيقونة Apple Touch عبر نفس مسار التحويل الحي
  // `/api/branding/icon/192` بدل الأيقونة الثابتة الافتراضية - وإلا نسقط
  // آمنًا للملف الثابت كما كان الحال دومًا.
  const appleTouchIcon = hasPwaIcon
    ? { url: "/api/branding/icon/192", sizes: "192x192" }
    : { url: "/icons/apple-touch-icon.png", sizes: "180x180" };

  return {
    title: settings?.metaTitle ?? settings?.platformNameAr ?? "أمبير",
    description: settings?.metaDescription ?? "منصة إدارة المولدات الأهلية",
    // /manifest.webmanifest يُولَّد ديناميكيًا من src/app/manifest.ts وليس
    // ملفًا ثابتًا بعد الآن - راجع التعليق هناك.
    manifest: "/manifest.webmanifest",
    icons: {
      icon: favicon
        ? [{ url: favicon }]
        : [
            { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
            { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
          ],
      apple: [appleTouchIcon],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings?.platformNameAr ?? "أمبير",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
  });

  return {
    themeColor: settings?.primaryColor ?? "#0EA5E9",
    width: "device-width",
    initialScale: 1,
    // يمنع تكبير الصفحة تلقائيًا عند التركيز على حقل إدخال في iOS، وهو
    // سلوك مزعج شائع في تطبيقات الويب على الجوال أثناء إدخال مبالغ الدفعات
    maximumScale: 1,
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });

  const arabicFont = settings?.arabicFont ?? "IBM Plex Sans Arabic";
  const englishFont = settings?.englishFont ?? "Inter";

  // ألوان ديناميكية قابلة للتغيير من لوحة Super Admin (المرحلة 8) دون إعادة بناء التطبيق
  const themeVars = {
    ["--color-primary" as string]: settings?.primaryColor ?? "#0EA5E9",
    ["--color-secondary" as string]: settings?.secondaryColor ?? "#64748B",
    ["--color-accent" as string]: settings?.accentColor ?? "#8B5CF6",
    ["--color-success" as string]: settings?.successColor ?? "#22C55E",
    ["--color-warning" as string]: settings?.warningColor ?? "#F59E0B",
    ["--color-error" as string]: settings?.errorColor ?? "#EF4444",
    // إصلاح: --font-arabic/--font-english لم يكونا مُعرَّفين في أي مكان
    // بالمشروع رغم استخدامهما في tailwind.config.ts (font-arabic كانت تعود
    // فعليًا لـ sans-serif الافتراضي دومًا). بما أن الخط بات قابلاً للتغيير
    // من Super Admin في وقت التشغيل (وليس وقت البناء)، لا يصلح next/font
    // التقليدي هنا (يتطلب اسم الخط معروفًا وقت البناء) - نحمّله عبر رابط
    // Google Fonts ديناميكي أدناه ونربط اسم العائلة عبر متغير CSS.
    ["--font-arabic" as string]: `"${arabicFont}", sans-serif`,
    ["--font-english" as string]: `"${englishFont}", sans-serif`,
  };

  const googleFontsHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    arabicFont
  )}:wght@400;500;600;700&family=${encodeURIComponent(englishFont)}:wght@400;500;600;700&display=swap`;

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={googleFontsHref} />
        {/* أيقونة الموقع (favicon) صارت تُدار بالكامل من generateMetadata
            أعلاه (ديناميكية عبر BrandAsset، مع سقوط آمن للملف الثابت) -
            أُزيل الـ <link> اليدوي هنا لأنه كان يُنتج وسمين مكرَّرين
            لنفس الغرض في <head>. */}
      </head>
      <body className="font-arabic antialiased bg-gray-50 text-gray-900" style={themeVars}>
        {children}
      </body>
    </html>
  );
}
