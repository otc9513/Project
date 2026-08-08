import { listPlatformAdminsAction } from "@/features/platform-admins/actions/platform-admin.actions";
import { PlatformAdminsPanel } from "./_components/platform-admins-panel";

export default async function AdminsPage() {
  const { admins, invites } = await listPlatformAdminsAction();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">فريق تشغيل المنصة</h1>
      <PlatformAdminsPanel
        admins={admins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          platformRole: a.platformRole,
        }))}
        invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role }))}
      />
    </div>
  );
}
