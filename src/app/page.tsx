import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

/**
 * لا توجد صفحة هبوط مستقلة للجذر "/" في هذا المنتج - المسار الوحيد
 * الحقيقي هو إما /app (تطبيق المستأجر) أو /login (تسجيل الدخول)،
 * حسب وجود جلسة صالحة من عدمه. middleware.ts يحمي /app و/super-admin
 * فقط ولا يتدخّل في "/" إطلاقًا (راجع authorized() في auth.config.ts)،
 * لذا يجب أن يكون لهذا المسار نفسه منطق التوجيه الخاص به هنا، وإلا
 * يُعيد Next.js صفحة 404 القياسية لعدم وجود page.tsx على الجذر.
 */
export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/app" : "/login");
}
