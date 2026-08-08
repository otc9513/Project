import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

/**
 * عميل تخزين موحّد لأي مزوّد متوافق مع S3 (Cloudflare R2 / MinIO / AWS S3
 * نفسه...) - وفق ما كان مخطَّطًا له مسبقًا في `.env.example` منذ إعداد
 * المشروع (STORAGE_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY). لا يُستخدم أي
 * تخزين محلي على القرص لأن معظم منصات الاستضافة الحديثة (Vercel وغيرها)
 * تملك نظام ملفات مؤقتًا (Ephemeral) يُفقَد بين عمليات النشر.
 */
let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;

  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "إعدادات التخزين (STORAGE_ENDPOINT/STORAGE_ACCESS_KEY/STORAGE_SECRET_KEY) غير مهيَّأة"
    );
  }

  client = new S3Client({
    endpoint,
    region: process.env.STORAGE_REGION ?? "auto",
    credentials: { accessKeyId, secretAccessKey },
    // مزوّدون متوافقون مع S3 (مثال: R2/MinIO) يتطلبون عادة Path-Style بدل
    // Virtual-Hosted-Style الافتراضي في AWS SDK.
    forcePathStyle: true,
  });
  return client;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB - كافٍ لشعارات/صور إعلانات، يمنع إساءة استخدام التخزين
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export class InvalidUploadError extends Error {}

/**
 * يرفع ملفًا إلى التخزين بعد التحقق من نوعه وحجمه (لا نثق أبدًا بامتداد
 * اسم الملف وحده - Content-Type الفعلي المُكتشَف من محتوى الملف هو المصدر
 * الموثوق، راجع src/lib/storage/image-processing.ts).
 */
export async function uploadObject(params: {
  buffer: Buffer;
  contentType: string;
  folder: "branding" | "announcements" | "notifications" | "receipts";
}): Promise<string> {
  if (params.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new InvalidUploadError("حجم الملف يتجاوز الحد الأقصى المسموح (5 ميغابايت)");
  }
  if (!ALLOWED_CONTENT_TYPES.has(params.contentType)) {
    throw new InvalidUploadError("صيغة الملف غير مدعومة (المسموح فقط: PNG, JPG, WEBP, SVG)");
  }

  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) throw new Error("STORAGE_BUCKET غير مهيَّأ");

  const extension = params.contentType.split("/")[1]?.replace("svg+xml", "svg") ?? "bin";
  const key = `${params.folder}/${nanoid(16)}.${extension}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
      // Cache-Control طويل: الأصول تُسمَّى بمعرّف عشوائي فريد لكل رفعة
      // (وليس اسمًا ثابتًا يُستبدل مكانه)، فلا حاجة أبدًا لإبطال ذاكرة
      // التخزين المؤقت - رابط قديم يبقى صالحًا لملفه القديم بالضبط.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const publicBase = process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT;
  return `${publicBase}/${bucket}/${key}`;
}

export async function deleteObjectByUrl(url: string): Promise<void> {
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) return;

  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const key = url.slice(idx + marker.length);

  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
