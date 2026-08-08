import { listPlatformCampaignsAction } from "@/features/platform-notifications/actions/platform-notification.actions";
import { listPlatformTenantsAction } from "@/features/platform-tenants/actions/platform-tenant.actions";
import { listPlatformPlansAction } from "@/features/platform-plans/actions/platform-plan.actions";
import { CampaignForm, CampaignRow } from "./_components/campaign-components";

export default async function NotificationsPage() {
  const [campaigns, tenantsPage, plans] = await Promise.all([
    listPlatformCampaignsAction(),
    // pageSize=100 (الحد الأقصى المسموح في listTenantsSchema) كافٍ لمنتقي
    // استهداف حملة عمليًا؛ منصة بأكثر من 100 مستأجر تحتاج بحثًا تدريجيًا
    // بدل تحميل الكل دفعة واحدة، خارج نطاق هذه المرحلة.
    listPlatformTenantsAction({ page: 1, pageSize: 100 }),
    listPlatformPlansAction(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">مركز الإشعارات (Push)</h1>

      <CampaignForm
        tenants={tenantsPage.items.map((t) => ({ id: t.id, name: t.name }))}
        plans={plans.map((p) => ({ id: p.id, nameAr: p.nameAr }))}
      />

      <ul className="space-y-2">
        {campaigns.map((c) => (
          <CampaignRow
            key={c.id}
            campaign={{
              id: c.id,
              title: c.title,
              message: c.message,
              status: c.status,
              stats: c.stats
                ? {
                    recipients: c.stats.recipients,
                    delivered: c.stats.delivered,
                    failed: c.stats.failed,
                  }
                : null,
            }}
          />
        ))}
        {campaigns.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            لا توجد حملات بعد
          </li>
        )}
      </ul>
    </div>
  );
}
