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
  // إلزامي: middleware يستورد auth() الكامل (NextAuth + PrismaAdapter) لأن
  // استراتيجية الجلسة "database" تتطلب استعلام Prisma عند كل طلب. Prisma
  // لا يعمل إطلاقًا على Edge Runtime (الافتراضي)، لذلك يجب فرض Node.js
  // runtime هنا صراحةً (مستقر ورسميًا منذ Next.js 15.5). بدون هذا السطر
  // سيفشل البناء على Vercel بسلسلة أخطاء "Node.js API not supported in
  // Edge Runtime" تظهر ملفًا بعد ملف حسب سلسلة الاستيراد.
  runtime: "nodejs",
};
