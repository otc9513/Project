/**
 * قرار هندسي (المرحلة 8): المواصفات تطلب جداول علائقية منفصلة
 * (Feature / PlanFeature / TenantFeatureOverride)، لكن نظام الأعلام الحالي
 * (Plan.features Json + Tenant.featureOverrides Json، مبني منذ المرحلة 2
 * ومستخدَم فعليًا في كل الوحدات عبر isFeatureEnabled/requireFeature) يحقق
 * نفس القاعدة التجارية (الخطة تُحدد الافتراضي، والمستأجر يمكن أن يتجاوزها)
 * بأداء أفضل (لا JOIN إضافي على كل تحقق صلاحية) وبدون أي هجرة بيانات على
 * مستأجرين موجودين فعليًا. لم أُغيّر هذه الآلية.
 *
 * هذا الملف فقط "سجل" ثابت بأسماء المفاتيح المعروفة ليُبنى منه واجهة
 * Super Admin (قائمة تبديل بدل تحرير JSON خام) - وليس مصدر الحقيقة نفسه.
 */
export interface FeatureDefinition {
  key: string;
  labelAr: string;
  labelEn: string;
  description: string;
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  { key: "billing", labelAr: "الفوترة والتحصيل", labelEn: "Billing & Collection", description: "توليد الفواتير الشهرية وتسجيل الدفعات" },
  { key: "reports", labelAr: "التقارير", labelEn: "Reports", description: "التقارير المالية وتصدير Excel/PDF" },
  { key: "expenses", labelAr: "المصاريف", labelEn: "Expenses", description: "تسجيل المصاريف التشغيلية" },
  { key: "maintenance", labelAr: "الصيانة والأعطال", labelEn: "Maintenance & Faults", description: "سجلات الصيانة وإدارة الأعطال" },
  { key: "pwaOffline", labelAr: "العمل دون اتصال (PWA)", labelEn: "Offline Mode (PWA)", description: "طابور الدفعات أوفلاين للمحصّلين" },
  { key: "ai", labelAr: "المساعد الذكي", labelEn: "AI Assistant", description: "ميزة مستقبلية: مساعد ذكي داخل التطبيق" },
  { key: "advancedAnalytics", labelAr: "تحليلات متقدمة", labelEn: "Advanced Analytics", description: "لوحات تحليل موسّعة تتجاوز التقارير الأساسية" },
];

export function isKnownFeatureKey(key: string): boolean {
  return FEATURE_REGISTRY.some((f) => f.key === key);
}
