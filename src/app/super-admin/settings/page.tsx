import { getPlatformSettingsAction } from "@/features/platform-settings/actions/platform-settings.actions";
import { BrandingSettingsForm } from "./_components/branding-settings-form";

const COLOR_DEFAULTS = {
  primaryColor: "#0EA5E9",
  secondaryColor: "#64748B",
  accentColor: "#8B5CF6",
  successColor: "#22C55E",
  warningColor: "#F59E0B",
  errorColor: "#EF4444",
};

export default async function SettingsPage() {
  const { settings, assets } = await getPlatformSettingsAction();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">البراندنغ والإعدادات العامة</h1>
      <BrandingSettingsForm
        settings={{
          platformNameAr: settings.platformNameAr,
          platformNameEn: settings.platformNameEn,
          companyName: settings.companyName,
          supportEmail: settings.supportEmail,
          supportPhone: settings.supportPhone,
          websiteUrl: settings.websiteUrl,
          primaryColor: settings.primaryColor || COLOR_DEFAULTS.primaryColor,
          secondaryColor: settings.secondaryColor || COLOR_DEFAULTS.secondaryColor,
          accentColor: settings.accentColor || COLOR_DEFAULTS.accentColor,
          successColor: settings.successColor || COLOR_DEFAULTS.successColor,
          warningColor: settings.warningColor || COLOR_DEFAULTS.warningColor,
          errorColor: settings.errorColor || COLOR_DEFAULTS.errorColor,
          arabicFont: settings.arabicFont,
          englishFont: settings.englishFont,
        }}
        assets={assets}
      />
    </div>
  );
}
