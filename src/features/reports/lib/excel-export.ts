import "server-only";
import ExcelJS from "exceljs";
import type { FullReport } from "../service/report.service";

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  FUEL: "الوقود",
  MAINTENANCE: "الصيانة",
  SPARE_PARTS: "قطع الغيار",
  SALARIES: "الرواتب",
  OTHER: "أخرى",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  PAID: "مدفوعة",
  UNPAID: "غير مدفوعة",
  PARTIAL: "مدفوعة جزئيًا",
  CANCELLED: "ملغاة",
};

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatDate(date: Date) {
  return date.toLocaleDateString("ar-IQ");
}

/**
 * تصدير Excel هو التصدير "الكامل عربيًا" في هذه الوحدة: ExcelJS يخزّن النص
 * كسلاسل Unicode عادية، فيُعرَض العربي بشكل صحيح تلقائيًا في Excel/Google
 * Sheets دون أي حاجة لتضمين خطوط أو تشكيل حروف (بخلاف PDF - راجع pdf-export.ts).
 */
export async function generateExcelReport(report: FullReport, tenantName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "أمبير (Ampere)";
  workbook.created = new Date();

  const currencyFormat = '#,##0 "د.ع"';

  // --- ورقة الملخص المالي ---
  const summarySheet = workbook.addWorksheet("الملخص المالي", {
    views: [{ rightToLeft: true }],
  });
  summarySheet.columns = [{ width: 28 }, { width: 20 }];
  summarySheet.addRow([tenantName]).font = { bold: true, size: 14 };
  summarySheet.addRow([
    `الفترة: ${formatDate(report.period.from)} — ${formatDate(report.period.to)}`,
  ]);
  summarySheet.addRow([]);

  const fs = report.financialSummary;
  const summaryRows: Array<[string, number]> = [
    ["إجمالي الإيرادات المحصّلة", fs.totalRevenue],
    ["عدد الدفعات", fs.paymentsCount],
    ["إجمالي المصاريف", fs.totalExpenses],
    ["عدد المصاريف", fs.expensesCount],
    ["صافي الربح", fs.netProfit],
  ];
  for (const [label, value] of summaryRows) {
    const row = summarySheet.addRow([label, value]);
    row.getCell(2).numFmt = currencyFormat;
  }

  summarySheet.addRow([]);
  summarySheet.addRow(["حالة الفواتير ضمن الفترة"]).font = { bold: true };
  const invoiceHeaderRow = summarySheet.addRow(["الحالة", "العدد", "المبلغ الكلي", "المبلغ المحصَّل"]);
  invoiceHeaderRow.font = { bold: true };
  for (const [status, data] of Object.entries(fs.invoices.byStatus)) {
    const row = summarySheet.addRow([
      INVOICE_STATUS_LABEL[status] ?? status,
      data.count,
      data.amount,
      data.paidAmount,
    ]);
    row.getCell(3).numFmt = currencyFormat;
    row.getCell(4).numFmt = currencyFormat;
  }

  // --- ورقة تحليل الإيرادات ---
  const revenueSheet = workbook.addWorksheet("تحليل الإيرادات", {
    views: [{ rightToLeft: true }],
  });
  revenueSheet.columns = [{ width: 20 }, { width: 20 }];
  const revenueHeaderRow = revenueSheet.addRow(["الشهر", "الإيرادات"]);
  revenueHeaderRow.font = { bold: true };
  for (const m of report.revenueAnalytics.monthly) {
    const row = revenueSheet.addRow([`${MONTH_NAMES[m.month - 1]} ${m.year}`, m.revenue]);
    row.getCell(2).numFmt = currencyFormat;
  }
  const revenueTotalRow = revenueSheet.addRow(["الإجمالي", report.revenueAnalytics.totalRevenue]);
  revenueTotalRow.font = { bold: true };
  revenueTotalRow.getCell(2).numFmt = currencyFormat;

  // --- ورقة تحليل المصاريف ---
  const expenseSheet = workbook.addWorksheet("تحليل المصاريف", {
    views: [{ rightToLeft: true }],
  });
  expenseSheet.columns = [{ width: 20 }, { width: 14 }, { width: 20 }];
  const expenseHeaderRow = expenseSheet.addRow(["الفئة", "العدد", "المبلغ"]);
  expenseHeaderRow.font = { bold: true };
  for (const c of report.expenseAnalytics.byCategory) {
    const row = expenseSheet.addRow([EXPENSE_CATEGORY_LABEL[c.category] ?? c.category, c.count, c.amount]);
    row.getCell(3).numFmt = currencyFormat;
  }
  const expenseTotalRow = expenseSheet.addRow(["الإجمالي", "", report.expenseAnalytics.totalExpenses]);
  expenseTotalRow.font = { bold: true };
  expenseTotalRow.getCell(3).numFmt = currencyFormat;

  // --- ورقة تقرير التحصيل ---
  const collectionSheet = workbook.addWorksheet("تقرير التحصيل", {
    views: [{ rightToLeft: true }],
  });
  collectionSheet.columns = [{ width: 24 }, { width: 14 }, { width: 20 }];
  const collectionHeaderRow = collectionSheet.addRow(["المحصّل", "عدد الدفعات", "المبلغ المحصَّل"]);
  collectionHeaderRow.font = { bold: true };
  for (const c of report.collectionReport.byCollector) {
    const row = collectionSheet.addRow([c.collectorName, c.paymentsCount, c.amount]);
    row.getCell(3).numFmt = currencyFormat;
  }
  const collectionTotalRow = collectionSheet.addRow([
    "الإجمالي",
    "",
    report.collectionReport.totalCollected,
  ]);
  collectionTotalRow.font = { bold: true };
  collectionTotalRow.getCell(3).numFmt = currencyFormat;

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
