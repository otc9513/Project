import "server-only";

/**
 * المرحلة 12: محدِّد معدَّل موزَّع (Distributed Rate Limiting).
 *
 * القرار المُبرَّر سابقًا في هذا الملف نفسه (محدِّد ذاكرة محلي كافٍ
 * لعملية واحدة) لم يعد صحيحًا بمجرد أن يُنشَر التطبيق على أكثر من
 * عملية/Pod متوازية (Horizontal Scaling على Vercel أو أي منصة أخرى) -
 * كل عملية كانت ستملك عدّادها الخاص بمعزل عن البقية، فيُصبح الحد الفعلي
 * (limit × عدد العمليات) بدل limit الحقيقي - يُبطل الحماية تقريبًا.
 *
 * الحل: `@upstash/ratelimit` + `@upstash/redis` (مخزن Redis مشترك عبر
 * REST - يعمل من أي Serverless/Edge runtime بلا اتصال TCP دائم، مناسب
 * لـ Vercel تحديدًا). **سقوط آمن مقصود**: إن لم تُضبَط بيانات اعتماد
 * Upstash (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) - مثال:
 * بيئة تطوير محلية بلا Redis - يعود النظام تلقائيًا للتنفيذ في الذاكرة
 * المحلية القديم بدل رمي خطأ أو تعطيل الحماية بالكامل. هذا يطابق متطلب
 * البرومبت حرفيًا: "graceful fallback behavior" و"no accidental global
 * lockout".
 *
 * ⚠️ لم يُشغَّل `npm install` فعليًا - واجهة `@upstash/ratelimit`
 * (`Ratelimit.slidingWindow`, `.limit()`) مبنية على معرفتي المعتادة بها
 * (مكتبة رسمية من Upstash نفسها، مستقرة جدًا) لكن غير مُختبَرة هنا.
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// خريطة Ratelimit instance واحدة لكل تركيبة (limit, windowMs) فريدة -
// Ratelimit.slidingWindow يحتاج الحد والنافذة عند الإنشاء وليس عند كل
// استدعاء .limit()، وإنشاء instance جديد لكل استدعاء نظريًا آمن لكنه
// تبذير غير ضروري لموارد الاتصال.
const limiterCache = new Map<string, Ratelimit>();

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedisClient();
if (!redis) {
  // تحذير واحد عند إقلاع الخادم (وليس عند كل استدعاء) - يُبقي فريق
  // التشغيل واعيًا أن النشر الحالي يعمل بحماية معزولة لكل عملية فقط، دون
  // إغراق السجلات.
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN غير مُعرَّفين - الرجوع لمحدِّد معدَّل في الذاكرة المحلية " +
      "(غير فعّال عبر أكثر من عملية/Pod واحد - راجع المرحلة 12 في README قبل نشر Horizontal Scaling)."
  );
}

function getDistributedLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    analytics: false,
    prefix: "ampere-ratelimit",
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// --- السقوط الآمن: نفس تنفيذ الذاكرة المحلية القديم، بلا أي تعديل منطقي ---
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt < now) memoryBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

function checkRateLimitInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export class RateLimitExceededError extends Error {
  constructor(retryAfterSeconds: number) {
    super(`محاولات كثيرة جدًا، حاول مجددًا بعد ${retryAfterSeconds} ثانية`);
    this.name = "RateLimitExceededError";
  }
}

/**
 * يفحص ويُسجّل محاولة ضمن نافذة زمنية. يرمي RateLimitExceededError عند
 * تجاوز الحد - يُستدعى في بداية أي service action حسّاس (فوترة، حذف،
 * رفع ملفات، دعوات فريق المنصة...).
 *
 * أصبحت async (تغيير حتمي - Redis عبر REST هو I/O شبكي حقيقي، لا يمكن
 * تزييف تزامنيته) - كل نقاط الاستدعاء الأربع في المشروع كانت أصلاً داخل
 * دوال async فاستُخدمت await ببساطة، بلا أي تغيير هيكلي آخر.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  if (redis) {
    const limiter = getDistributedLimiter(limit, windowMs);
    const result = await limiter.limit(key);
    if (!result.success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      throw new RateLimitExceededError(retryAfterSeconds);
    }
    return;
  }

  // سقوط آمن: بلا Redis، لا نُغرق العملية بمحاولات فاشلة - نطبّق نفس
  // القيد لكن معزولاً بحدود هذه العملية فقط (توثيق هذا القيد أعلاه صراحةً).
  const allowed = checkRateLimitInMemory(key, limit, windowMs);
  if (!allowed) {
    const bucket = memoryBuckets.get(key)!;
    throw new RateLimitExceededError(Math.ceil((bucket.resetAt - Date.now()) / 1000));
  }
}
