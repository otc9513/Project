export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center" dir="rtl">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
        📡
      </div>
      <h1 className="mb-2 text-lg font-bold text-gray-900">لا يوجد اتصال بالإنترنت</h1>
      <p className="max-w-xs text-sm text-gray-500">
        هذه الصفحة لم تُفتَح من قبل، فلا تتوفّر نسخة محفوظة منها. الصفحات
        التي زُرتَها سابقًا (مثل قائمة التحصيل) تبقى متاحة أوفلاين.
      </p>
      <p className="mt-4 text-xs text-gray-400">
        أي دفعات تُسجَّل الآن على صفحات محفوظة ستُزامَن تلقائيًا عند عودة
        الاتصال.
      </p>
    </div>
  );
}
