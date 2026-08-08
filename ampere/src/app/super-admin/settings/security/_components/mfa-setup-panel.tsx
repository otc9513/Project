"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  startMfaEnrollmentAction,
  confirmMfaEnrollmentAction,
  disableMfaAction,
} from "@/features/platform-mfa/actions/platform-mfa.actions";

type Status = { enabled: boolean; enrolledAt: Date | null; remainingRecoveryCodes: number };

export function MfaSetupPanel({ initialStatus }: { initialStatus: Status }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // تدفّق التسجيل
  const [enrollment, setEnrollment] = useState<{ qrCodeDataUrl: string; secretForManualEntry: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [revealedRecoveryCodes, setRevealedRecoveryCodes] = useState<string[] | null>(null);

  // تدفّق التعطيل
  const [disableCode, setDisableCode] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);

  function beginEnrollment() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startMfaEnrollmentAction();
        setEnrollment(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذّر بدء الإعداد");
      }
    });
  }

  function confirmEnrollment() {
    setError(null);
    startTransition(async () => {
      try {
        const { recoveryCodes } = await confirmMfaEnrollmentAction(confirmCode);
        setRevealedRecoveryCodes(recoveryCodes);
        setEnrollment(null);
        setConfirmCode("");
        setStatus({ enabled: true, enrolledAt: new Date(), remainingRecoveryCodes: recoveryCodes.length });
      } catch (err) {
        setError(err instanceof Error ? err.message : "الكود غير صحيح");
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      try {
        await disableMfaAction(disableCode);
        setShowDisableForm(false);
        setDisableCode("");
        setStatus({ enabled: false, enrolledAt: null, remainingRecoveryCodes: 0 });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "الكود غير صحيح");
      }
    });
  }

  // شاشة عرض أكواد الاسترداد لمرة واحدة فقط بعد التفعيل الناجح
  if (revealedRecoveryCodes) {
    return (
      <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-medium text-gray-800">
          احفظ أكواد الاسترداد هذه في مكان آمن - لن تُعرَض مرة أخرى أبدًا. كل
          كود يُستخدَم مرة واحدة فقط إن فقدت جهاز المصادقة.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-white p-3 font-mono text-sm" dir="ltr">
          {revealedRecoveryCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <button
          onClick={() => setRevealedRecoveryCodes(null)}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white"
        >
          حفظتها في مكان آمن - إغلاق
        </button>
      </div>
    );
  }

  if (status.enabled) {
    return (
      <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-4">
        <p className="text-sm font-medium text-success">✓ المصادقة الثنائية مُفعَّلة</p>
        <p className="text-xs text-gray-500">
          أكواد استرداد متبقية: {status.remainingRecoveryCodes}
        </p>
        {!showDisableForm ? (
          <button
            onClick={() => setShowDisableForm(true)}
            className="text-sm text-danger underline"
          >
            تعطيل 2FA
          </button>
        ) : (
          <div className="space-y-2">
            <input
              placeholder="أدخل كود التحقق الحالي لتأكيد التعطيل"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              dir="ltr"
            />
            <button
              disabled={isPending || !disableCode}
              onClick={disable}
              className="w-full rounded-lg bg-danger py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              تأكيد التعطيل
            </button>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  if (enrollment) {
    return (
      <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">
          امسح رمز QR بتطبيق مصادقة (Google Authenticator، Authy، إلخ)، أو
          أدخل السر يدويًا:
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enrollment.qrCodeDataUrl} alt="رمز QR لإعداد 2FA" className="mx-auto h-48 w-48" />
        <p className="break-all rounded-lg bg-gray-50 p-2 text-center font-mono text-xs" dir="ltr">
          {enrollment.secretForManualEntry}
        </p>
        <input
          placeholder="أدخل الكود المكوَّن من 6 أرقام"
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-center text-sm"
          dir="ltr"
          maxLength={6}
        />
        <button
          disabled={isPending || confirmCode.length !== 6}
          onClick={confirmEnrollment}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "جارٍ التحقق..." : "تأكيد وتفعيل"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">المصادقة الثنائية غير مُفعَّلة حاليًا.</p>
      <button
        disabled={isPending}
        onClick={beginEnrollment}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        تفعيل المصادقة الثنائية
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
