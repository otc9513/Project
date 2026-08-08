import "server-only";
import { prisma } from "@/lib/prisma";

export interface CronRunStats {
  tenantsProcessed: number;
  trialsExpired: number;
  subscriptionsExpired: number;
  invoicesGenerated: number;
  invoicesMarkedOverdue: number;
  errors: Array<{ tenantId?: string; message: string }>;
}

export function emptyCronStats(): CronRunStats {
  return {
    tenantsProcessed: 0,
    trialsExpired: 0,
    subscriptionsExpired: 0,
    invoicesGenerated: 0,
    invoicesMarkedOverdue: 0,
    errors: [],
  };
}

/**
 * يفتح سجل تنفيذ جديد فور بدء المهمة (status=RUNNING) - هكذا يظهر تشغيل
 * عالق/منقطع بوضوح في لوحة المراقبة إن توقفت العملية فجأة (Timeout،
 * إعادة نشر...) بدل أن يختفي بلا أثر.
 */
export async function startCronRun(jobName: string) {
  const log = await prisma.cronExecutionLog.create({
    data: { jobName, startedAt: new Date(), status: "RUNNING" },
  });
  return log.id;
}

export async function finishCronRun(
  logId: string,
  status: "SUCCESS" | "FAILED",
  stats: CronRunStats
) {
  await prisma.cronExecutionLog.update({
    where: { id: logId },
    data: {
      finishedAt: new Date(),
      status,
      tenantsProcessed: stats.tenantsProcessed,
      trialsExpired: stats.trialsExpired,
      subscriptionsExpired: stats.subscriptionsExpired,
      invoicesGenerated: stats.invoicesGenerated,
      invoicesMarkedOverdue: stats.invoicesMarkedOverdue,
      errors: stats.errors.length > 0 ? stats.errors : undefined,
    },
  });
}
