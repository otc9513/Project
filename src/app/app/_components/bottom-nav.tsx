import Link from "next/link";
import type { Role } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "الرئيسية", roles: ["OWNER", "ADMIN", "ACCOUNTANT", "COLLECTOR", "TECHNICIAN"] },
  { href: "/app/subscribers", label: "المشتركون", roles: ["OWNER", "ADMIN", "ACCOUNTANT", "COLLECTOR"] },
  { href: "/app/billing", label: "الفواتير", roles: ["OWNER", "ADMIN", "ACCOUNTANT"] },
  { href: "/app/collection", label: "التحصيل", roles: ["OWNER", "ADMIN", "COLLECTOR"] },
  { href: "/app/expenses", label: "المصاريف", roles: ["OWNER", "ADMIN", "ACCOUNTANT"] },
  { href: "/app/fuel", label: "الوقود", roles: ["OWNER", "ADMIN", "ACCOUNTANT", "TECHNICIAN"] },
  { href: "/app/maintenance", label: "الصيانة", roles: ["OWNER", "ADMIN", "TECHNICIAN"] },
  { href: "/app/faults", label: "الأعطال", roles: ["OWNER", "ADMIN", "TECHNICIAN", "COLLECTOR"] },
  { href: "/app/reports", label: "التقارير", roles: ["OWNER", "ADMIN", "ACCOUNTANT"] },
  // المرحلة 5: صفحة اشتراك المستأجر الذاتية - مقصورة على OWNER/ADMIN
  // (قرار اشتراك بالمنصة نفسها، وليس عملية تشغيلية يومية كباقي القائمة)
  { href: "/app/subscription", label: "الاشتراك", roles: ["OWNER", "ADMIN"] },
];

export function BottomNav({ role }: { role: Role }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white md:static md:w-56 md:flex-col md:border-t-0 md:border-l">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs text-gray-600 active:bg-gray-50 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
