"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_STORAGE_KEY = "ampere:install-prompt-dismissed";

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS القديم يستخدم خاصية غير قياسية
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * `beforeinstallprompt` مدعوم على Chrome/Edge/Samsung Internet وغير مدعوم
 * إطلاقًا على Safari iOS - لذلك لهاتف iPhone نعرض تعليمات يدوية بدل انتظار
 * حدث لن يصل أبدًا (مهم لأن جزءًا كبيرًا من المستخدمين المستهدَفين قد
 * يستخدمون iPhone).
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return; // مُثبَّت بالفعل، لا داعي للافتة
    setDismissed(localStorage.getItem(DISMISS_STORAGE_KEY) === "1");

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_STORAGE_KEY, "1");
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      dismiss();
      return;
    }
    if (isIos()) {
      setShowIosInstructions(true);
      return;
    }
  }

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !isIos()) return null;

  if (showIosInstructions) {
    return (
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="mb-2 font-medium">لتثبيت التطبيق على آيفون:</p>
        <ol className="list-inside list-decimal space-y-1 text-gray-600">
          <li>اضغط زر المشاركة (Share) في متصفح Safari</li>
          <li>اختر &quot;إضافة إلى الشاشة الرئيسية&quot; (Add to Home Screen)</li>
        </ol>
        <button onClick={dismiss} className="mt-3 text-xs font-medium text-primary underline">
          فهمت، إخفاء
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm font-medium text-gray-700">ثبّت تطبيق أمبير على جهازك</p>
      <div className="flex gap-2">
        <button
          onClick={handleInstallClick}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white"
        >
          تثبيت
        </button>
        <button onClick={dismiss} className="rounded-lg px-2 py-1.5 text-xs text-gray-400">
          لاحقًا
        </button>
      </div>
    </div>
  );
}
