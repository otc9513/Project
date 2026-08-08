"use server";

import { reportService } from "../service/report.service";
import type { ReportPeriodInput } from "../schema/report.schema";

export async function getFinancialSummaryReportAction(period: ReportPeriodInput) {
  return reportService.financialSummary(period);
}

export async function getRevenueAnalyticsReportAction(period: ReportPeriodInput) {
  return reportService.revenueAnalytics(period);
}

export async function getExpenseAnalyticsReportAction(period: ReportPeriodInput) {
  return reportService.expenseAnalytics(period);
}

export async function getCollectionReportAction(period: ReportPeriodInput) {
  return reportService.collectionReport(period);
}

export async function getFullReportAction(period: ReportPeriodInput) {
  return reportService.fullReport(period);
}
