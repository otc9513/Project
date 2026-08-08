// حزمة `arabic-reshaper` لا تُصدِّر أنواع TypeScript ولا يوجد لها حزمة
// `@types/arabic-reshaper` منشورة - هذا الملف يُعرِّفها كوحدة (module)
// بأدنى حد كافٍ لإسكات خطأ TS7016 دون التأثير على السلوك وقت التشغيل.
declare module "arabic-reshaper" {
  const ArabicReshaper: {
    convertArabic: (text: string) => string;
  };
  export default ArabicReshaper;
}
