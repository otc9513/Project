import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform/context";

const NAV_ITEMS = [
  { href: "/super-admin", label: "نظرة عامة" },
  { href: "/super-admin/tenants", label: "المستأجرون" },
  { href: "/super-admin/plans", label: "الخطط" },
  { href: "/super-admin/billing", label: "فوترة SaaS" },
  { href: "/super-admin/announcements", label: "الإعلانات" },
  { href: "/super-admin/notifications", label: "الإشعارات" },
  { href: "/super-admin/settings", label: "البراندنغ" },
  { href: "/super-admin/settings/security", label: "الأمان (2FA)" },
  { href: "/super-admin/admins", label: "فريق المنصة" },
  { href: "/super-admin/audit-logs", label: "سجل التدقيق" },
];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPPORT_ADMIN: "Support Admin",
  FINANCE_ADMIN: "Finance Admin",
};

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // نقطة الحراسة الوحيدة لكل لوحة Super Admin بأكملها: requirePlatformAdmin()
  // ترمي خطأ (يُعالَج في error.tsx بنفس هذا المجلد) إن لم يكن المستخدم
  // عضوًا في فريق تشغيل المنصة إطلاقًا.
  const ctx = await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-60 shrink-0 border-l border-gray-200 bg-white p-4 md:block">
        <div className="mb-6">
          <p className="text-lg font-bold text-primary">لوحة تحكم المنصة</p>
          <p className="mt-1 text-xs text-gray-400">{ROLE_LABEL[ctx.role]}</p>
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white p-4 md:hidden">
          <p className="text-base font-bold text-primary">لوحة تحكم المنصة</p>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-gray-200 bg-white p-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
