export { auth as middleware } from "@/lib/auth/auth";

/**
 * يطبّق middleware على كل المسارات ما عدا:
 * - ملفات Next.js الداخلية (_next)
 * - الأصول الثابتة (صور، أيقونات...)
 * - ملفات PWA (manifest, service worker, صفحة offline الاحتياطية)
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|offline).*)",
  ],
};
