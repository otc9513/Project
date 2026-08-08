"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * حالة خاصة في Next.js App Router: خطأ يقع داخل RootLayout نفسه (وليس
 * في صفحة فرعية) لا يُمسَك بأي error.tsx عادي لأن error.tsx يفترض وجود
 * layout أب سليم يُعيد عرضه حوله. global-error.tsx هو الوحيد القادر على
 * معالجة هذه الحالة تحديدًا - ويجب أن يحتوي <html>/<body> بنفسه لأنه
 * يستبدل RootLayout بالكامل عند تفعيله.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 text-center shadow-sm">
            <h1 className="mb-2 text-lg font-bold text-danger">حدث خطأ غير متوقع</h1>
            <p className="mb-4 text-sm text-gray-500">
              يرجى تحديث الصفحة أو المحاولة لاحقًا - تم إبلاغ الفريق التقني تلقائيًا.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
