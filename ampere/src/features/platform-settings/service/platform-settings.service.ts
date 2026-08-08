import "server-only";
import { requirePlatformAdmin, requireSuperAdminOnly } from "@/lib/platform/context";
import { recordPlatformAuditEntry } from "@/lib/audit/audit-log.service";
import { platformSettingsRepository } from "../repository/platform-settings.repository";
import { uploadObject } from "@/lib/storage/object-storage";
import { processUploadedImage } from "@/lib/storage/image-processing";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  updatePlatformSettingsSchema,
  uploadBrandAssetSchema,
  type UpdatePlatformSettingsInput,
} from "../schema/platform-settings.schema";
import type { BrandAssetType } from "@prisma/client";

/**
 * البراندنغ والإعدادات العامة: SUPER_ADMIN فقط قادر على التعديل
 * (المواصفات صريحة: "Only Super Admin can change branding") - حتى
 * SUPPORT_ADMIN و FINANCE_ADMIN لا يملكان هذه الصلاحية.
 */
export const platformSettingsService = {
  async get() {
    await requirePlatformAdmin();
    const [settings, assets] = await Promise.all([
      platformSettingsRepository.get(),
      platformSettingsRepository.listAssets(),
    ]);
    return { settings, assets };
  },

  async update(input: UpdatePlatformSettingsInput) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);

    const data = updatePlatformSettingsSchema.parse(input);
    const before = await platformSettingsRepository.get();
    const settings = await platformSettingsRepository.update(data);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.settings.updated",
      entityType: "PlatformSettings",
      entityId: "singleton",
      changes: { before, after: settings },
    });

    return settings;
  },

  /**
   * رفع أصل بصري (شعار/أيقونة). type يُحدَّد من الفورم بدل الاستدلال من
   * اسم الملف - المستدعي (Route Handler) هو من يمرّره صراحة بعد تحققه من
   * قيمة معروفة عبر uploadBrandAssetSchema.
   */
  async uploadAsset(params: { type: string; fileBuffer: Buffer; declaredContentType: string }) {
    const ctx = await requirePlatformAdmin();
    requireSuperAdminOnly(ctx);
    // يمنع استنزاف حصة التخزين الخارجي أو معالجة صور مفرطة عبر رفع متكرر سريع
    await checkRateLimit(`brand-asset-upload:${ctx.userId}`, 20, 60 * 60 * 1000);

    const { type } = uploadBrandAssetSchema.parse({ type: params.type });
    const { buffer, contentType } = await processUploadedImage(
      params.fileBuffer,
      params.declaredContentType
    );

    const url = await uploadObject({ buffer, contentType, folder: "branding" });
    const asset = await platformSettingsRepository.upsertAsset(type as BrandAssetType, url);

    await recordPlatformAuditEntry({
      adminUserId: ctx.userId,
      action: "platform.brand_asset.uploaded",
      entityType: "BrandAsset",
      entityId: asset.id,
      changes: { after: { type, url } },
    });

    return asset;
  },
};
