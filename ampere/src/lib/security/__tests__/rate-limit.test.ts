import { describe, it, expect } from "vitest";
import { checkRateLimit, RateLimitExceededError } from "../rate-limit";

describe("checkRateLimit - السقوط الآمن للذاكرة المحلية (بلا Upstash في بيئة الاختبار)", () => {
  it("يسمح بمحاولات ضمن الحد المسموح", async () => {
    const key = `test-${Date.now()}-a`;
    await expect(checkRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
    await expect(checkRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
    await expect(checkRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
  });

  it("يرفض المحاولة التي تتجاوز الحد برمي RateLimitExceededError", async () => {
    const key = `test-${Date.now()}-b`;
    await checkRateLimit(key, 2, 60_000);
    await checkRateLimit(key, 2, 60_000);
    await expect(checkRateLimit(key, 2, 60_000)).rejects.toThrow(RateLimitExceededError);
  });

  it("مفاتيح مختلفة لا تتشارك نفس العدّاد (عزل لكل مستخدم/IP على حدة)", async () => {
    const keyA = `test-${Date.now()}-c-A`;
    const keyB = `test-${Date.now()}-c-B`;
    await checkRateLimit(keyA, 1, 60_000);
    // نفس الحد لمفتاح مختلف تمامًا - يجب ألا يتأثر بامتلاء keyA
    await expect(checkRateLimit(keyB, 1, 60_000)).resolves.toBeUndefined();
  });

  it("النافذة الزمنية تنتهي وتُعيد ضبط العدّاد (نافذة قصيرة جدًا للاختبار)", async () => {
    const key = `test-${Date.now()}-d`;
    await checkRateLimit(key, 1, 50); // نافذة 50ms فقط
    await expect(checkRateLimit(key, 1, 50)).rejects.toThrow(RateLimitExceededError);

    await new Promise((resolve) => setTimeout(resolve, 60));

    await expect(checkRateLimit(key, 1, 50)).resolves.toBeUndefined();
  });
});
