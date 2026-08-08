import { getMfaStatusAction } from "@/features/platform-mfa/actions/platform-mfa.actions";
import { MfaSetupPanel } from "./_components/mfa-setup-panel";

export default async function SecuritySettingsPage() {
  const status = await getMfaStatusAction();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-bold">الأمان - المصادقة الثنائية (2FA)</h1>
      <p className="text-sm text-gray-500">
        طبقة حماية إضافية إلزاميًا موصى بها لكل عضو في فريق تشغيل المنصة -
        تحمي لوحة التحكم حتى لو تسرّبت بيانات حساب Google الخاص بك.
      </p>
      <MfaSetupPanel initialStatus={status} />
    </div>
  );
}
