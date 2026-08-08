import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "يجب أن يكون اللون بصيغة HEX مثل #0EA5E9")
  .optional();

export const updatePlatformSettingsSchema = z.object({
  platformNameAr: z.string().min(2).max(100).optional(),
  platformNameEn: z.string().min(2).max(100).optional(),
  companyName: z.string().max(200).optional().nullable(),
  copyright: z.string().max(200).optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  supportPhone: z.string().max(30).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  successColor: hexColor,
  warningColor: hexColor,
  errorColor: hexColor,
  arabicFont: z.string().max(100).optional().nullable(),
  englishFont: z.string().max(100).optional().nullable(),
});
export type UpdatePlatformSettingsInput = z.infer<typeof updatePlatformSettingsSchema>;

export const BRAND_ASSET_TYPES = [
  "MAIN_LOGO",
  "SIDEBAR_LOGO",
  "SMALL_LOGO",
  "LOGIN_LOGO",
  "FAVICON",
  "PWA_ICON",
  "SPLASH_ICON",
  "SOCIAL_SHARE_IMAGE",
] as const;

export const uploadBrandAssetSchema = z.object({
  type: z.enum(BRAND_ASSET_TYPES),
});
export type UploadBrandAssetInput = z.infer<typeof uploadBrandAssetSchema>;
