import "server-only";
import * as Sentry from "@sentry/nextjs";
import { platformTenantRepository } from "@/features/platform-tenants/repository/platform-tenant.repository";
import { platformBillingRepository } from "../repository/platform-billing.repository";
import { startCronRun, finishCronRun, emptyCronStats, type CronRunStats } from "@/lib/cron/cron-log";

/** كم يومًا قبل انتهاء الاشتراك الفعلي تُولَّد فاتورة التجديد القادمة، لإتاحة وقت للدفع قبل توقف الخدمة. */
const RENEWAL_LEAD_DAYS = 7;

const JOB_NAME = "billing-lifecycle";

/**
 * المهمة اليومية الوحيدة المسؤولة عن دورة حياة اشتراكات SaaS بأكملها:
 * 1) إنهاء التجارب المنتهية (TRIAL → EXPIRED)
 * 2) إنهاء الاشتراكات المدفوعة المنتهية دون تجديد (ACTIVE → EXPIRED)
 * 3) تعليم الفواتير المتأخرة (UNPAID → OVERDUE)
 * 4) توليد فواتير التجديد القادمة لمن اقترب موعد اشتراكه
 *
 * آمنة تمامًا للتشغيل المتكرر/المتزامن (راجع createRenewalInvoiceIfDue
 * والقيد الفريد في قاعدة البيانات) - لا تُنشئ أبدًا فواتير مكرَّرة.
 * خطأ في معالجة مستأجر واحد لا يوقف بقية الدفعة - يُسجَّل في errors
 * وتستمر المعالجة.
 */
export async function runBillingLifecycleCron() {
  const logId = await startCronRun(JOB_NAME);
  const stats: CronRunStats = emptyCronStats();

  // يُرفَق بكل حدث Sentry يُرسَل من داخل هذه الدالة (بما فيها من مستودعات
  // مستدعاة) - يسمح بتصفية "كل أخطاء الفوترة الدورية" دفعة واحدة في
  // لوحة Sentry بدل البحث النصي في الرسائل.
  Sentry.setTag("cron.job", JOB_NAME);
  Sentry.setTag("cron.logId", logId);

  try {
    // 1) التجارب المنتهية
    const expiredTrials = await platformTenantRepository.findExpiredTrials();
    for (const tenant of expiredTrials) {
      try {
        await platformTenantRepository.updateStatus(tenant.id, "EXPIRED");
        stats.trialsExpired += 1;
        stats.tenantsProcessed += 1;
      } catch (error) {
        stats.errors.push({ tenantId: tenant.id, message: toMessage(error) });
        // مستوى "warning" لا "error": فشل مستأجر واحد لا يوقف الدفعة
        // (راجع منطق try/catch لكل مستأجر أدناه) فلا يستحق نفس إلحاح
        // فشل المهمة بأكملها - لكنه يستحق ظهورًا في Sentry للمراجعة.
        Sentry.captureException(error, { level: "warning", tags: { tenantId: tenant.id } });
      }
    }

    // 2) الاشتراكات المدفوعة المنتهية دون تجديد
    const expiredActive = await platformTenantRepository.findExpiredActiveSubscriptions();
    for (const tenant of expiredActive) {
      try {
        await platformTenantRepository.updateStatus(tenant.id, "EXPIRED");
        stats.subscriptionsExpired += 1;
        stats.tenantsProcessed += 1;
      } catch (error) {
        stats.errors.push({ tenantId: tenant.id, message: toMessage(error) });
        Sentry.captureException(error, { level: "warning", tags: { tenantId: tenant.id } });
      }
    }

    // 3) الفواتير المتأخرة
    const overdueResult = await platformBillingRepository.markOverdue();
    stats.invoicesMarkedOverdue = overdueResult.count;

    // 4) فواتير التجديد القادمة (تُستبعد تلقائيًا الحالات EXPIRED للتو أعلاه
    // لأن الاستعلام يفلتر status=ACTIVE وقد جرى تحديثها فعليًا قبل هذا السطر)
    const dueForRenewal = await platformTenantRepository.findTenantsDueForRenewalInvoice(
      RENEWAL_LEAD_DAYS
    );
    for (const tenant of dueForRenewal) {
      try {
        const result = await platformBillingRepository.createRenewalInvoiceIfDue(tenant);
        stats.tenantsProcessed += 1;
        if (result.created) stats.invoicesGenerated += 1;
      } catch (error) {
        stats.errors.push({ tenantId: tenant.id, message: toMessage(error) });
        Sentry.captureException(error, { level: "warning", tags: { tenantId: tenant.id } });
      }
    }

    // SUCCESS تعني أن المهمة أكملت المرور على كل الدفعة، حتى لو فشل بعض
    // المستأجرين الأفراد (مُسجَّلون في errors أعلاه للمراجعة). FAILED
    // محجوزة فقط لفشل غير متوقَّع أوقف المهمة بأكملها (راجع catch أدناه).
    await finishCronRun(logId, "SUCCESS", stats);
    return { logId, ...stats };
  } catch (error) {
    stats.errors.push({ message: toMessage(error) });
    // مستوى "error" (الافتراضي): فشل أوقف المهمة بأكملها - يستحق تنبيهًا فوريًا.
    Sentry.captureException(error);
    await finishCronRun(logId, "FAILED", stats);
    throw error;
  }
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
