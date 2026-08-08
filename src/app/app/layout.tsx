import { requireTenantContext } from "@/lib/tenant/context";
import { BottomNav } from "./_components/bottom-nav";
import { AnnouncementsBanner } from "./_components/announcements-banner";
import { OfflineSyncBanner } from "@/components/pwa/offline-sync-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PushNotificationToggle } from "@/components/pwa/push-notification-toggle";
import { platformAnnouncementService } from "@/features/platform-announcements/service/platform-announcement.service";

/**
 * وفق مبدأ "Mobile First" في المواصفات: التنقّل الأساسي شريط سفلي بأزرار
 * كبيرة، وليس قائمة جانبية تقليدية (التي تُستخدم فقط على الشاشات الكبيرة).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // يفرض وجود جلسة ومساحة عمل نشطة قبل عرض أي صفحة داخل /app
  const ctx = await requireTenantContext();

  // الإعلانات غير حرجة لعمل التطبيق: أي خطأ في جلبها (مثال: مشكلة عابرة
  // بقاعدة البيانات) يجب ألا يُسقط تخطيط /app بأكمله - نتجاهله بصمت
  // ونعرض التطبيق بدون لافتة بدل صفحة خطأ كاملة لميزة تسويقية ثانوية.
  const announcements = await platformAnnouncementService
    .listVisibleForCurrentTenant()
    .catch(() => []);

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0 md:flex-row">
      <OfflineSyncBanner />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-2 flex justify-end">
          <PushNotificationToggle />
        </div>
        <InstallPrompt />
        <AnnouncementsBanner announcements={announcements} />
        {children}
      </main>
      <BottomNav role={ctx.role} />
    </div>
  );
}
