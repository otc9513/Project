import "server-only";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { shapeArabicForPdf, containsArabic } from "./arabic-shaping";
import type { FullReport } from "../service/report.service";

/**
 * قرار هندسي مهم يجب توثيقه صراحةً:
 *
 * pdf-lib لا يتضمّن محرك تشكيل نصوص (Text Shaping) مثل HarfBuzz، وبالتالي
 * لا يمكنه رسم حروف عربية متصلة بأشكالها الصحيحة تلقائيًا حتى مع تضمين
 * خط عربي عبر fontkit - fontkit يضمّن الخط فقط، ولا يشكّل النص.
 *
 * الحل المُطبَّق هنا (المرحلة 6 - سبق أن كانت مرحلة سابقة تركت ملاحظة
 * تحقّق تفصيلية هنا حول هذا القيد بالضبط):
 * 1) `arabic-shaping.ts` (جديد) يطبّق Reshaping (تحويل كل حرف لشكله
 *    السياقي الصحيح) ثم Bidi reordering (ترتيب الرسم البصري) قبل أي
 *    استدعاء لـ `drawText` - عبر حزمتي `arabic-reshaper` و`bidi-js`
 *    المُضافتين في package.json.
 * 2) لا يزال يتطلّب خط TTF عربي حقيقي (Amiri أو Noto Naskh Arabic
 *    مثلاً) في `public/fonts/arabic-regular.ttf` - غير متوفر في هذه
 *    الجلسة (بلا اتصال إنترنت لتنزيله). المنطق الكامل جاهز ويعمل تلقائيًا
 *    فور إضافة الملف؛ لا حاجة لأي تعديل كود إضافي.
 * 3) طالما لم يوجد الخط، يبقى التصدير بنسخة إنجليزية بالكامل (كما كان)
 *    مع توجيه لتصدير Excel - **لا ندّعي دعمًا عربيًا لا يمكننا التحقق
 *    منه فعليًا بدون الخط والبناء الحقيقي**.
 *
 * ⚠️ يتطلّب التحقق بعد توفر بيئة فيها اتصال إنترنت (راجع أيضًا الملاحظة
 * التفصيلية أعلى arabic-shaping.ts حول توافق واجهتي الحزمتين):
 *   - تشغيل `npm install` لجلب `arabic-reshaper`/`bidi-js` فعليًا.
 *   - إضافة خط عربي حقيقي إلى `public/fonts/arabic-regular.ttf`.
 *   - توليد PDF فعلي بمحتوى عربي/مختلط وفحصه بصريًا (تشكيل الحروف،
 *     اتجاه القراءة، محاذاة الأعمدة، الأرقام) - هذا ما لا يمكن التحقق
 *     منه آليًا في بيئة هذه الجلسة.
 */

const ARABIC_FONT_PATH = path.join(process.cwd(), "public", "fonts", "arabic-regular.ttf");

const EXPENSE_CATEGORY_LABEL_EN: Record<string, string> = {
  FUEL: "Fuel",
  MAINTENANCE: "Maintenance",
  SPARE_PARTS: "Spare Parts",
  SALARIES: "Salaries",
  OTHER: "Other",
};

// نفس التسميات العربية المستخدَمة أصلاً في src/app/app/expenses/page.tsx -
// إعادة استخدام بدل اختراع ترجمة جديدة قد تتعارض مع بقية الواجهة.
const EXPENSE_CATEGORY_LABEL_AR: Record<string, string> = {
  FUEL: "وقود",
  MAINTENANCE: "صيانة",
  SPARE_PARTS: "قطع غيار",
  SALARIES: "رواتب",
  OTHER: "أخرى",
};

const INVOICE_STATUS_LABEL_EN: Record<string, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  CANCELLED: "Cancelled",
};

// نفس التسميات المستخدَمة أصلاً في src/app/app/billing/page.tsx
const INVOICE_STATUS_LABEL_AR: Record<string, string> = {
  PAID: "مدفوعة",
  UNPAID: "غير مدفوعة",
  PARTIAL: "مدفوعة جزئيًا",
  CANCELLED: "ملغاة",
};

function formatCurrency(value: number, arabic: boolean) {
  return arabic
    ? `${Math.round(value).toLocaleString("ar-IQ")} د.ع`
    : `${Math.round(value).toLocaleString("en-US")} IQD`;
}

/**
 * StandardFonts.Helvetica (ترميز WinAnsi) يرمي استثناءً فوريًا عند رسم أي حرف
 * خارج Latin-1 - وأسماء المستأجرين في منتج "عربي أولًا" ستكون عربية غالبًا.
 * في وضع الخط الاحتياطي (بدون خط عربي مُضمَّن) نُصفّي أي محتوى غير قابل
 * للترميز بدل تعطّل التصدير بالكامل.
 */
function sanitizeForStandardFont(text: string, fallback: string): string {
  // eslint-disable-next-line no-control-regex
  const asciiOnly = text.replace(/[^\x20-\x7E]/g, "").trim();
  return asciiOnly.length > 0 ? asciiOnly : fallback;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

interface Cursor {
  page: PDFPage;
  y: number;
  font: PDFFont;
  boldFont: PDFFont;
}

const MARGIN = 50;
const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4

function ensureSpace(doc: PDFDocument, cursor: Cursor, needed: number): Cursor {
  if (cursor.y - needed < MARGIN) {
    const page = doc.addPage(PAGE_SIZE);
    return { ...cursor, page, y: PAGE_SIZE[1] - MARGIN };
  }
  return cursor;
}

/**
 * يرسم نصًا في خلية عمود بعرض مُحدَّد. إن كان النص عربيًا (وخط عربي
 * مُضمَّن) يُشكَّل ويُعاد ترتيبه بصريًا (راجع arabic-shaping.ts) ويُحاذى
 * لليمين داخل عرض العمود - وهذا هو الاتجاه الطبيعي لقراءة العربية،
 * بخلاف النص الإنجليزي/الأرقام الذي يبقى محاذًى لليسار كما كان.
 */
function drawCell(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  font: PDFFont,
  hasArabicFont: boolean
) {
  const isArabic = hasArabicFont && containsArabic(text);
  const shaped = isArabic ? shapeArabicForPdf(text) : text;

  let drawX = x;
  if (isArabic) {
    try {
      const textWidth = font.widthOfTextAtSize(shaped, size);
      drawX = x + Math.max(0, width - textWidth);
    } catch {
      drawX = x;
    }
  }

  page.drawText(shaped, { x: drawX, y, size, font, color: rgb(0.15, 0.15, 0.15) });
}

function drawHeading(doc: PDFDocument, cursor: Cursor, textEn: string, textAr: string, hasArabicFont: boolean): Cursor {
  cursor = ensureSpace(doc, cursor, 36);
  const text = hasArabicFont ? textAr : textEn;
  const isArabic = hasArabicFont && containsArabic(text);
  const shaped = isArabic ? shapeArabicForPdf(text) : text;

  let x = MARGIN;
  if (isArabic) {
    const contentWidth = PAGE_SIZE[0] - MARGIN * 2;
    try {
      const textWidth = cursor.boldFont.widthOfTextAtSize(shaped, 14);
      x = MARGIN + Math.max(0, contentWidth - textWidth);
    } catch {
      x = MARGIN;
    }
  }

  cursor.page.drawText(shaped, {
    x,
    y: cursor.y,
    size: 14,
    font: cursor.boldFont,
    color: rgb(0.05, 0.05, 0.05),
  });
  return { ...cursor, y: cursor.y - 24 };
}

function drawRow(
  doc: PDFDocument,
  cursor: Cursor,
  cols: string[],
  widths: number[],
  hasArabicFont: boolean,
  bold = false
): Cursor {
  cursor = ensureSpace(doc, cursor, 18);
  let x = MARGIN;
  const font = bold ? cursor.boldFont : cursor.font;
  cols.forEach((text, idx) => {
    const colWidth = widths[idx] ?? 100;
    drawCell(cursor.page, text, x, cursor.y, colWidth, 10, font, hasArabicFont);
    x += colWidth;
  });
  return { ...cursor, y: cursor.y - 16 };
}

export async function generatePdfReport(report: FullReport, tenantName: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  let font: PDFFont;
  let boldFont: PDFFont;
  const hasArabicFont = fs.existsSync(ARABIC_FONT_PATH);

  if (hasArabicFont) {
    const bytes = fs.readFileSync(ARABIC_FONT_PATH);
    font = await doc.embedFont(bytes, { subset: true });
    boldFont = font;
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
    boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  let cursor: Cursor = {
    page: doc.addPage(PAGE_SIZE),
    y: PAGE_SIZE[1] - MARGIN,
    font,
    boldFont,
  };

  const safeTenantName = hasArabicFont
    ? tenantName
    : sanitizeForStandardFont(tenantName, "Ampere Generator Report");

  cursor = drawHeading(
    doc,
    cursor,
    `${safeTenantName} - Financial Report`,
    `${safeTenantName} - التقرير المالي`,
    hasArabicFont
  );
  cursor = drawRow(
    doc,
    cursor,
    [
      hasArabicFont
        ? `الفترة: ${formatDate(report.period.from)} إلى ${formatDate(report.period.to)}`
        : `Period: ${formatDate(report.period.from)} to ${formatDate(report.period.to)}`,
    ],
    [500],
    hasArabicFont
  );
  cursor.y -= 8;

  // Financial summary
  cursor = drawHeading(doc, cursor, "Financial Summary", "الملخص المالي", hasArabicFont);
  const fs_ = report.financialSummary;
  const summaryRows: [string, string, number][] = [
    ["Total Revenue", "إجمالي الإيرادات", fs_.totalRevenue],
    ["Total Expenses", "إجمالي المصاريف", fs_.totalExpenses],
    ["Net Profit", "صافي الربح", fs_.netProfit],
  ];
  for (const [en, ar, value] of summaryRows) {
    cursor = drawRow(doc, cursor, [hasArabicFont ? ar : en, formatCurrency(value, hasArabicFont)], [200, 200], hasArabicFont);
  }
  cursor = drawRow(
    doc,
    cursor,
    [hasArabicFont ? "عدد الدفعات" : "Payments Count", String(fs_.paymentsCount)],
    [200, 200],
    hasArabicFont
  );
  cursor.y -= 8;

  cursor = drawRow(
    doc,
    cursor,
    hasArabicFont
      ? ["الحالة", "العدد", "المبلغ", "المدفوع"]
      : ["Status", "Count", "Amount", "Paid"],
    [120, 80, 150, 150],
    hasArabicFont,
    true
  );
  for (const [status, data] of Object.entries(fs_.invoices.byStatus)) {
    const statusLabel = hasArabicFont
      ? (INVOICE_STATUS_LABEL_AR[status] ?? status)
      : (INVOICE_STATUS_LABEL_EN[status] ?? status);
    cursor = drawRow(
      doc,
      cursor,
      [statusLabel, String(data.count), formatCurrency(data.amount, hasArabicFont), formatCurrency(data.paidAmount, hasArabicFont)],
      [120, 80, 150, 150],
      hasArabicFont
    );
  }
  cursor.y -= 16;

  // Revenue analytics
  cursor = drawHeading(doc, cursor, "Revenue Analytics (Monthly)", "تحليل الإيرادات (شهري)", hasArabicFont);
  cursor = drawRow(
    doc,
    cursor,
    hasArabicFont ? ["الشهر", "الإيرادات"] : ["Month", "Revenue"],
    [200, 200],
    hasArabicFont,
    true
  );
  for (const m of report.revenueAnalytics.monthly) {
    cursor = drawRow(
      doc,
      cursor,
      [`${m.year}-${String(m.month).padStart(2, "0")}`, formatCurrency(m.revenue, hasArabicFont)],
      [200, 200],
      hasArabicFont
    );
  }
  cursor.y -= 16;

  // Expense analytics
  cursor = drawHeading(doc, cursor, "Expense Analytics (By Category)", "تحليل المصاريف (حسب الفئة)", hasArabicFont);
  cursor = drawRow(
    doc,
    cursor,
    hasArabicFont ? ["الفئة", "العدد", "المبلغ"] : ["Category", "Count", "Amount"],
    [200, 100, 200],
    hasArabicFont,
    true
  );
  for (const c of report.expenseAnalytics.byCategory) {
    const categoryLabel = hasArabicFont
      ? (EXPENSE_CATEGORY_LABEL_AR[c.category] ?? c.category)
      : (EXPENSE_CATEGORY_LABEL_EN[c.category] ?? c.category);
    cursor = drawRow(
      doc,
      cursor,
      [categoryLabel, String(c.count), formatCurrency(c.amount, hasArabicFont)],
      [200, 100, 200],
      hasArabicFont
    );
  }
  cursor.y -= 16;

  // Collection report
  cursor = drawHeading(doc, cursor, "Collection Report (By Collector)", "تقرير التحصيل (حسب المحصّل)", hasArabicFont);
  cursor = drawRow(
    doc,
    cursor,
    hasArabicFont ? ["المحصّل", "الدفعات", "المبلغ"] : ["Collector", "Payments", "Amount"],
    [200, 100, 200],
    hasArabicFont,
    true
  );
  for (const c of report.collectionReport.byCollector) {
    const collectorName = hasArabicFont
      ? c.collectorName
      : sanitizeForStandardFont(c.collectorName, "Collector");
    cursor = drawRow(
      doc,
      cursor,
      [collectorName, String(c.paymentsCount), formatCurrency(c.amount, hasArabicFont)],
      [200, 100, 200],
      hasArabicFont
    );
  }

  if (!hasArabicFont) {
    cursor.y -= 16;
    cursor = drawRow(
      doc,
      cursor,
      ["Note: for a fully Arabic-formatted export, use the Excel export instead."],
      [500],
      false
    );
  }

  return doc.save();
}
