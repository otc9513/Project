import { getPlatformTenantAction } from "@/features/platform-tenants/actions/platform-tenant.actions";
import { listPlatformPlansAction } from "@/features/platform-plans/actions/platform-plan.actions";
import { TenantActionsPanel } from "./_components/tenant-actions-panel";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tenant, plans] = await Promise.all([
    getPlatformTenantAction(id),
    listPlatformPlansAction(),
  ]);

  const owner = tenant.memberships.find((m) => m.role === "OWNER")?.user;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">{tenant.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{tenant.slug}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-400">المالك</dt>
            <dd>{owner?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400">البريد الإلكتروني</dt>
            <dd dir="ltr">{owner?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400">رقم التواصل</dt>
            <dd dir="ltr">{tenant.contactPhone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-400">الخطة الحالية</dt>
            <dd>{tenant.plan.nameAr}</dd>
          </div>
          <div>
            <dt className="text-gray-400">تاريخ الإنشاء</dt>
            <dd>{new Date(tenant.createdAt).toLocaleDateString("ar-IQ")}</dd>
          </div>
          <div>
            <dt className="text-gray-400">انتهاء التجربة/الاشتراك</dt>
            <dd>
              {(tenant.subscriptionEndsAt ?? tenant.trialEndsAt)
                ? new Date(tenant.subscriptionEndsAt ?? tenant.trialEndsAt!).toLocaleDateString(
                    "ar-IQ"
                  )
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">عدد الموظفين</dt>
            <dd>{tenant._count.memberships}</dd>
          </div>
          <div>
            <dt className="text-gray-400">عدد المشتركين</dt>
            <dd>{tenant._count.subscribers}</dd>
          </div>
        </dl>

        {tenant.suspensionReason && (
          <p className="mt-4 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            سبب التعليق/الإلغاء: {tenant.suspensionReason}
          </p>
        )}
      </div>

      <TenantActionsPanel
        tenantId={tenant.id}
        status={tenant.status}
        planId={tenant.planId}
        plans={plans.map((p) => ({ id: p.id, nameAr: p.nameAr }))}
        featureOverrides={tenant.featureOverrides as Record<string, boolean>}
        planFeatures={tenant.plan.features as Record<string, boolean>}
      />
    </div>
  );
}
