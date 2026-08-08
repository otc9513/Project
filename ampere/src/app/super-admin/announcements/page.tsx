import { listPlatformAnnouncementsAction } from "@/features/platform-announcements/actions/platform-announcement.actions";
import { AnnouncementForm } from "./_components/announcement-form";

export default async function AnnouncementsPage() {
  const announcements = await listPlatformAnnouncementsAction();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">الإعلانات</h1>

      <div className="space-y-3">
        {announcements.map((a) => (
          <details key={a.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium">
              <span>
                {a.title}
                {!a.isActive && (
                  <span className="mr-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                    غير نشط
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(a.startDate).toLocaleDateString("ar-IQ")}
              </span>
            </summary>
            <div className="border-t border-gray-100 p-4">
              <AnnouncementForm
                initial={{
                  id: a.id,
                  title: a.title,
                  description: a.description,
                  buttonText: a.buttonText,
                  buttonUrl: a.buttonUrl,
                  priority: a.priority,
                  startDate: new Date(a.startDate).toISOString().slice(0, 10),
                  endDate: a.endDate ? new Date(a.endDate).toISOString().slice(0, 10) : "",
                  allTenants: (a.visibility as { allTenants: boolean }).allTenants,
                  isActive: a.isActive,
                }}
              />
            </div>
          </details>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">إعلان جديد</h2>
        <AnnouncementForm />
      </div>
    </div>
  );
}
