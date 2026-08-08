"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyMfaChallengeAction } from "@/features/platform-mfa/actions/platform-mfa.actions";

export function MfaChallengeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await verifyMfaChallengeAction(code);
        router.push("/super-admin");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "الكود غير صحيح");
      }
    });
  }

  return (
    <div className="space-y-3">
      <input
        placeholder="XXXXXX أو XXXX-XXXX"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-full rounded-lg border border-gray-200 px-3 py-3 text-center text-lg tracking-widest"
        dir="ltr"
        autoFocus
      />
      <button
        disabled={isPending || !code}
        onClick={submit}
        className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "جارٍ التحقق..." : "تحقق"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
