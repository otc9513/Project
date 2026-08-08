import "server-only";
import { requirePlatformAdmin } from "@/lib/platform/context";
import {
  platformAuditRepository,
  type ListPlatformAuditInput,
} from "../repository/platform-audit.repository";

/**
 * سجل تدقيق شامل على مستوى المنصة: يعرض كل الإجراءات الحسّاسة عبر كل
 * المستأجرين معًا (وليس مستأجرًا واحدًا كما في وحدات كل مستأجر العادية).
 * القراءة متاحة لكل أدوار فريق المنصة (شفافية داخلية) - لا يوجد تعديل أو
 * حذف على الإطلاق لأي سجل تدقيق من أي واجهة (السجلات غير قابلة للتغيير).
 */
export const platformAuditService = {
  async list(input: ListPlatformAuditInput) {
    await requirePlatformAdmin();
    return platformAuditRepository.findMany(input);
  },
};
