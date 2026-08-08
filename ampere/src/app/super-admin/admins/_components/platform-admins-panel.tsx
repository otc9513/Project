"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  invitePlatformAdminAction,
  cancelPlatformAdminInviteAction,
  revokePlatformAdminAction,
} from "@/features/platform-admins/actions/platform-admin.actions";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPPORT_ADMIN: "Support Admin",
  FINANCE_ADMIN: "Finance Admin",
};

interface Admin {
  id: string;
  name: string | null;
  email: string;
  platformRole: string | null;
}
interface Invite {
  id: string;
  email: string;
  role: string;
}

export function PlatformAdminsPanel({ admins, invites }: { admins: Admin[]; invites: Invite[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SUPPORT_ADMIN");

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "حدث خطأ");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">دعوة عضو جديد</p>
        <p className="mb-3 text-xs text-gray-400">
          الدخول عبر Google فقط - أدخل بريده وسيُمنح الدور تلقائيًا عند أول تسجيل دخول له.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={isPending || !email}
          onClick={() =>
            run(async () => {
              await invitePlatformAdminAction({ email, role: role as never });
              setEmail("");
            })
          }
          className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          إرسال الدعوة
        </button>
      </div>

      {invites.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium">دعوات معلَّقة</p>
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between text-sm">
                <span dir="ltr">{inv.email}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{ROLE_LABEL[inv.role]}</span>
                  <button
                    disabled={isPending}
                    onClick={() => run(() => cancelPlatformAdminInviteAction({ inviteId: inv.id }))}
                    className="rounded-lg bg-danger/10 px-2 py-1 text-xs text-danger"
                  >
                    إلغاء
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">أعضاء فريق المنصة</p>
        <ul className="space-y-2">
          {admins.map((admin) => (
            <li key={admin.id} className="flex items-center justify-between text-sm">
              <div>
                <p>{admin.name ?? admin.email}</p>
                <p className="text-xs text-gray-400" dir="ltr">
                  {admin.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                  {ROLE_LABEL[admin.platformRole ?? ""]}
                </span>
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`سحب صلاحية ${admin.email} عن لوحة المنصة؟`)) {
                      run(() => revokePlatformAdminAction({ userId: admin.id }));
                    }
                  }}
                  className="rounded-lg bg-danger/10 px-2 py-1 text-xs text-danger"
                >
                  سحب الصلاحية
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
