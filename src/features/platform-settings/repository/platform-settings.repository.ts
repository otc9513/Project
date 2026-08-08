import "server-only";
import { prisma } from "@/lib/prisma";
import type { BrandAssetType } from "@prisma/client";
import type { UpdatePlatformSettingsInput } from "../schema/platform-settings.schema";

export const platformSettingsRepository = {
  get() {
    return prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
  },

  update(data: UpdatePlatformSettingsInput) {
    return prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
  },

  listAssets() {
    return prisma.brandAsset.findMany();
  },

  upsertAsset(type: BrandAssetType, url: string) {
    return prisma.brandAsset.upsert({
      where: { type },
      update: { url },
      create: { type, url },
    });
  },
};
