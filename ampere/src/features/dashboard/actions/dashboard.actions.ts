"use server";

import { dashboardService } from "../service/dashboard.service";
import type { DashboardPeriodInput } from "../schema/dashboard.schema";

export async function getDashboardSummaryAction(filter: Partial<DashboardPeriodInput>) {
  return dashboardService.getSummary(filter);
}
