import { recordPaymentAction } from "@/features/collection/actions/collection.actions";
import {
  listPendingPayments,
  removePendingPayment,
  markPendingPaymentFailed,
  type QueuedPayment,
} from "./db";

/**
 * لماذا "مزامنة عند حدث `online` + عند فتح الصفحة" بدل Service Worker
 * Background Sync API؟ لأن Background Sync **غير مدعوم إطلاقًا على Safari
 * (iOS/iPadOS)** حتى تاريخ كتابة هذا الكود، وجزء كبير من مستخدمي الميدان
 * (المحصّلين) في العراق يستخدمون أجهزة iPhone. الاعتماد عليه وحده كان سيجعل
 * المزامنة "تعمل أحيانًا فقط" حسب نوع الجهاز - غير مقبول لميزة مالية حرجة.
 * هذا الأسلوب (Online Event + مزامنة عند بدء التشغيل) يعمل على كل المتصفحات.
 */

export interface SyncResult {
  synced: QueuedPayment[];
  conflicted: Array<{ payment: QueuedPayment; message: string }>;
}

let syncInFlight = false;

export async function syncPendingPayments(): Promise<SyncResult> {
  // منع تشغيل مزامنتين متزامنتين (مثال: حدث `online` يُطلَق مع تركيز
  // النافذة في نفس اللحظة) لتفادي محاولة إرسال نفس الدفعة مرتين معًا.
  if (syncInFlight) {
    return { synced: [], conflicted: [] };
  }
  syncInFlight = true;

  const result: SyncResult = { synced: [], conflicted: [] };

  try {
    const pending = await listPendingPayments();

    // إرسال تسلسلي (وليس متوازٍ) عمدًا: دفعات نفس الفاتورة يجب أن تُطبَّق
    // بترتيب تسجيلها الأصلي حتى لا يُرفَض تسلسل صحيح بسبب قيد "لا تتجاوز
    // مبلغ الفاتورة" في collectionService.recordPayment.
    for (const payment of pending) {
      try {
        await recordPaymentAction({ invoiceId: payment.invoiceId, amount: payment.amount });
        await removePendingPayment(payment.localId);
        result.synced.push(payment);
      } catch (error) {
        // فشل حقيقي (مثال: الفاتورة أُلغيت، أو دُفعت بالكامل من محصّل آخر
        // بينما كان الجهاز غير متصل) - نُبقي السجل مع رسالة الخطأ ليراه
        // المحصّل ويحل التعارض يدويًا، بدل حذفه بصمت وضياع أثر المبلغ.
        const message = error instanceof Error ? error.message : "تعذّرت المزامنة";
        await markPendingPaymentFailed(payment.localId, message);
        result.conflicted.push({ payment, message });
      }
    }
  } finally {
    syncInFlight = false;
  }

  return result;
}
