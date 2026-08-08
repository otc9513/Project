import { vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

/**
 * موقع Mock واحد لعميل Prisma الوحيد في المشروع (src/lib/prisma.ts) -
 * كل خدمة/مستودع (repository) في المشروع يستورد `{ prisma }` من نفس
 * هذا المسار حصرًا، فتمويهه هنا مرة واحدة يكفي لكل الاختبارات دون أي
 * اتصال فعلي بقاعدة بيانات. راجع src/test/prisma-mock.ts للحصول على
 * مرجع مكتوب النوع (typed) لنفس الكائن داخل ملفات الاختبار.
 *
 * ⚠️ استخدمت هنا شكل الـ factory الصريح (وليس نمط مجلد `__mocks__`
 * الضمني المُعتاد مع Jest/Vitest) عمدًا لتفادي أي التباس محتمل في حل
 * مسار "@/lib/prisma" المُستعار (tsconfig paths) عبر الاصطلاح الضمني -
 * هذا الشكل الصريح مضمون العمل بغضّ النظر عن تفاصيل الحل الداخلي لألياس
 * المسارات.
 */
vi.mock("@/lib/prisma", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

beforeEach(async () => {
  const { prisma } = await import("@/lib/prisma");
  mockReset(prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>);
});
