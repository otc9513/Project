/**
 * تطبيق (Normalization) والتحقق من أرقام الهواتف العراقية فقط (+964).
 *
 * ⚠️ ملف بلا "server-only": يُستخدم في الـ client component لعرض رسائل
 * تحقق فورية (UX) وأيضًا في Server Actions كمصدر الحقيقة النهائي - نفس
 * الدالة بالضبط في الاثنين حتى لا يتعارض الطرفان أبدًا (متطلب صريح:
 * تطبيع موحّد بين Registration/Login/Database/Duplicate checking).
 *
 * الصيغة المقبولة محليًا: 07XXXXXXXXX (11 رقمًا، يبدأ بـ 07).
 * الصيغة المخزَّنة دائمًا: +9647XXXXXXXXX (E.164).
 *
 * ملاحظة صادقة: هذا تحقق من الصيغة العامة (طول + بادئة 07) وليس تحققًا
 * من نطاقات المشغّلين الفعلية (Zain/Asiacell/Korek لها بادئات محددة
 * أضيق). كافٍ لمنع الإدخال الخاطئ الشائع، لكن لا يضمن أن الرقم "حي"
 * فعليًا لدى مشغّل حقيقي - لا يوجد OTP للتحقق من ذلك وفق المتطلبات.
 */

export type PhoneValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function normalizeAndValidateIraqiPhone(
  rawInput: string
): PhoneValidationResult {
  const trimmed = (rawInput ?? "").trim();

  if (!trimmed) {
    return { ok: false, error: "رقم الهاتف مطلوب" };
  }

  // يسمح فقط بالأرقام و + والفواصل الشائعة (مسافة/شرطة/أقواس) - أي حرف
  // آخر (بما فيها الأحرف الأبجدية) يُرفَض صراحةً هنا، قبل أي تنظيف.
  if (!/^[0-9+\-()\s]+$/.test(trimmed)) {
    return { ok: false, error: "رقم الهاتف يحتوي على رموز غير صحيحة" };
  }

  const cleaned = trimmed.replace(/[\s\-()]/g, "");

  let localDigits: string;
  if (cleaned.startsWith("+964")) {
    localDigits = cleaned.slice(4);
  } else if (cleaned.startsWith("00964")) {
    localDigits = cleaned.slice(5);
  } else if (cleaned.startsWith("964") && cleaned.length > 10) {
    localDigits = cleaned.slice(3);
  } else if (cleaned.startsWith("0")) {
    localDigits = cleaned.slice(1);
  } else {
    localDigits = cleaned;
  }

  // بعد إزالة أي بادئة دولية/صفر محلي: يجب أن يتبقى بالضبط 10 أرقام
  // تبدأ بـ 7 (نمط كل الأرقام المحمولة العراقية).
  if (!/^7\d{9}$/.test(localDigits)) {
    return {
      ok: false,
      error:
        "رقم الهاتف غير صحيح - يجب أن يكون رقمًا عراقيًا بصيغة 07XXXXXXXXX",
    };
  }

  return { ok: true, normalized: `+964${localDigits}` };
}

/** يعرض الرقم المطبَّع بصيغة محلية مقروءة للعرض فقط (لا يُستخدم للتخزين/المطابقة). */
export function formatIraqiPhoneForDisplay(normalized: string): string {
  if (!normalized.startsWith("+964")) return normalized;
  const local = normalized.slice(4);
  return `0${local}`;
}
