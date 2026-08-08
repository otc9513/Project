import "server-only";

/**
 * ⚠️ ملاحظة تحقّق صريحة (راجع أيضًا القسم المخصَّص في README تحت "PR-6"):
 *
 * لم يتسنَّ تشغيل `npm install` أو أي بناء فعلي في بيئة هذه الجلسة (بلا
 * اتصال إنترنت - راجع "PR-0" في README). التعامل مع `arabic-reshaper` و
 * `bidi-js` هنا مبني على معرفتي بواجهتيهما المُوثَّقتين المعتادتين وليس
 * على اختبار فعلي. بعد `npm install` في بيئة حقيقية:
 *   1) تأكد أن `ArabicReshaper.convertArabic(text)` هو الاسم الصحيح
 *      للدالة المُصدَّرة من نسخة `arabic-reshaper` المثبَّتة فعليًا -
 *      بعض إصدارات هذه الحزمة تُصدِّر API مختلفًا قليلاً (مثال:
 *      `reshape(text)` مباشرة بدل كائن مع طرق متعددة).
 *   2) تأكد من نفس الشيء لـ `bidi-js` (`getEmbeddingLevels`/`getReorderedString`).
 * إن اختلفت الأسماء، عدّل الاستيراد/الاستدعاء أدناه فقط - بقية منطق
 * الرسم في pdf-export.ts لا يحتاج أي تغيير.
 */
import ArabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

const bidi = bidiFactory();

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** يحدّد إن كان النص يحتوي حرفًا عربيًا واحدًا على الأقل - يُستخدم لتقرير محاذاة الخلية (يمين لعربي، يسار لإنجليزي/أرقام). */
export function containsArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

/**
 * يحوّل نصًا عربيًا (أو مختلطًا عربي/إنجليزي) إلى تسلسل الحروف الصحيح
 * للرسم المباشر بـ pdf-lib:
 *
 * 1) Reshaping: يستبدل كل حرف عربي "منفصل" (شكل Unicode الأساسي) بشكله
 *    السياقي الصحيح (ابتدائي/وسطي/نهائي/معزول) حسب موقعه بين الحروف
 *    المجاورة - بدونه تظهر الحروف منفصلة وغير متصلة بصريًا.
 * 2) Bidi reordering: يعيد ترتيب الأحرف إلى "ترتيب الرسم البصري" (من
 *    اليسار لليمين بترتيب الرسم الفعلي على الصفحة) لأن pdf-lib يرسم كل
 *    حرف بالترتيب المنطقي للسلسلة النصية بدل تطبيق خوارزمية Unicode
 *    Bidirectional Algorithm بنفسه - فنطبّقها نحن يدويًا قبل الرسم.
 *
 * الأرقام والنص اللاتيني داخل نص عربي مختلط (مثال: "الفاتورة #1234")
 * يُعالَجان بشكل صحيح تلقائيًا لأن كلا الخطوتين تعملان على مستوى Unicode
 * الكامل للسلسلة وليس فقط الأحرف العربية.
 */
export function shapeArabicForPdf(text: string): string {
  if (!containsArabic(text)) return text;

  try {
    const reshaped = ArabicReshaper.convertArabic(text);
    const embeddingLevels = bidi.getEmbeddingLevels(reshaped);
    return bidi.getReorderedString(reshaped, embeddingLevels);
  } catch {
    // فشل التشكيل (مثال: نسخة حزمة غير متوافقة) يجب ألا يُسقط توليد PDF
    // بأكمله - نُعيد النص الخام (سيظهر بحروف عربية منفصلة غير متصلة، لكن
    // المستند يبقى قابلاً للتوليد والقراءة جزئيًا بدل فشل كامل).
    return text;
  }
}
