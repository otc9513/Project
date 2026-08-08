import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * التحقق من تفعيل ميزة معينة لمستأجر:
 * 1) نبدأ من ميزات الخطة (Plan.features).
 * 2) نُطبّق فوقها أي تجاوز خاص بالمستأجر (Tenant.featureOverrides) إن وُجد.
 *
 * مثال من المواصفات:
 *   خطة Professional: billing=true, reports=true, ai=false
 *   تجاوز خاص بمستأجر A: ai=true → يصبح AI مفعّلاً لهذا المستأجر فقط.
 */
export async function isFeatureEnabled(
  tenantId: string,
  featureKey: string
): Promise<boolean> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: { plan: true },
  });

  const planFeatures = (tenant.plan.features as Record<string, boolean>) ?? {};
  const overrides = (tenant.featureOverrides as Record<string, boolean>) ?? {};

  if (Object.prototype.hasOwnProperty.call(overrides, featureKey)) {
    return Boolean(overrides[featureKey]);
  }
  return Boolean(planFeatures[featureKey]);
}

/**
 * حارس يُستخدم داخل الـ services: يرمي خطأً واضحًا إذا كانت الميزة
 * غير مفعّلة لخطة المستأجر الحالية (مثال: تقارير متقدمة، AI...).
 */
export async function requireFeature(tenantId: string, featureKey: string) {
  const enabled = await isFeatureEnabled(tenantId, featureKey);
  if (!enabled) {
    throw new Error(
      `هذه الميزة (${featureKey}) غير متاحة ضمن خطة اشتراكك الحالية`
    );
  }
}
