"use server";

import { revalidatePath } from "next/cache";
import { platformSettingsService } from "../service/platform-settings.service";
import type { UpdatePlatformSettingsInput } from "../schema/platform-settings.schema";

export async function getPlatformSettingsAction() {
  return platformSettingsService.get();
}

export async function updatePlatformSettingsAction(input: UpdatePlatformSettingsInput) {
  const settings = await platformSettingsService.update(input);
  revalidatePath("/super-admin/settings");
  revalidatePath("/", "layout"); // البراندنغ تظهر في التخطيط الجذري لكل التطبيق
  return settings;
}

/**
 * رفع أصل بصري عبر Server Action مباشرة (Next.js يدعم كائنات File ضمن
 * FormData في server actions أصلاً) بدل Route Handler منفصل - نلتزم بنفس
 * القرار المعماري الموثَّق سابقًا في المشروع: "Server Actions بدل REST API
 * منفصل ما أمكن". الاستثناء الوحيد المتبقي في المشروع لتصدير PDF/Excel لأن
 * بثّ ملف ثنائي بترويسة Content-Disposition غير ممكن عبر server action.
 */
export async function uploadBrandAssetAction(formData: FormData) {
  const file = formData.get("file");
  const type = formData.get("type");

  if (!(file instanceof File) || typeof type !== "string") {
    throw new Error("طلب رفع غير صالح: الملف أو النوع مفقود");
  }

  const arrayBuffer = await file.arrayBuffer();
  const asset = await platformSettingsService.uploadAsset({
    type,
    fileBuffer: Buffer.from(arrayBuffer),
    declaredContentType: file.type,
  });

  revalidatePath("/super-admin/settings");
  revalidatePath("/", "layout");
  return asset;
}
