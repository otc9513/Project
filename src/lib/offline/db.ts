import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * لماذا IndexedDB (عبر `idb`) وليس localStorage؟
 * localStorage متزامن (Synchronous) ويحظر Main Thread، وسعته صغيرة (~5MB)،
 * ولا يُستخدم أبدًا داخل Service Worker (غير متاح هناك إطلاقًا) - بينما
 * IndexedDB غير متزامن ومتاح من الصفحة والـ Service Worker معًا، وهو الخيار
 * القياسي لطوابير عمل PWA غير متصلة (Offline-First Queues).
 */

export interface QueuedPayment {
  localId: string;
  invoiceId: string;
  amount: number;
  subscriberName: string;
  queuedAt: string; // ISO
  status: "pending" | "syncing" | "failed";
  errorMessage?: string;
}

interface AmpereOfflineDB extends DBSchema {
  pendingPayments: {
    key: string; // localId
    value: QueuedPayment;
    indexes: { "by-status": string };
  };
}

const DB_NAME = "ampere-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AmpereOfflineDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("offline DB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<AmpereOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("pendingPayments", { keyPath: "localId" });
        store.createIndex("by-status", "status");
      },
    });
  }
  return dbPromise;
}

export async function enqueuePendingPayment(
  payment: Omit<QueuedPayment, "localId" | "queuedAt" | "status">
): Promise<QueuedPayment> {
  const db = await getDb();
  const record: QueuedPayment = {
    ...payment,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    status: "pending",
  };
  await db.add("pendingPayments", record);
  return record;
}

export async function listPendingPayments(): Promise<QueuedPayment[]> {
  const db = await getDb();
  return db.getAll("pendingPayments");
}

export async function removePendingPayment(localId: string): Promise<void> {
  const db = await getDb();
  await db.delete("pendingPayments", localId);
}

export async function markPendingPaymentFailed(localId: string, errorMessage: string): Promise<void> {
  const db = await getDb();
  const record = await db.get("pendingPayments", localId);
  if (!record) return;
  await db.put("pendingPayments", { ...record, status: "failed", errorMessage });
}

export async function countPendingPayments(): Promise<number> {
  const db = await getDb();
  return db.count("pendingPayments");
}
