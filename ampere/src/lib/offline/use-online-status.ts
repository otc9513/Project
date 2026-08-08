"use client";

import { useEffect, useState } from "react";

/**
 * `navigator.onLine` غير موثوق 100% (قد يكون `true` مع اتصال ضعيف جدًا لا
 * يصل فعليًا للخادم)، لكنه كافٍ هنا كإشارة أولية لإظهار/إخفاء لافتة الحالة
 * ولإطلاق محاولة المزامنة - فشل المزامنة نفسها (طلب الشبكة الفعلي) هو خط
 * الدفاع الحقيقي المُعتمَد عليه في `syncPendingPayments`.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
