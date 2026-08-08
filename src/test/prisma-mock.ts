import { prisma } from "@/lib/prisma";
import type { DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

/**
 * نفس كائن `prisma` المُصدَّر من src/lib/prisma.ts - لكن بعد أن يُموّهه
 * src/test/setup.ts (يُحمَّل تلقائيًا قبل كل ملف اختبار عبر
 * vitest.config.ts). هذا الملف فقط يعيد الإسناد بنوع صريح (Type Cast)
 * ليعطي إكمالًا تلقائيًا صحيحًا (`prismaMock.tenant.findMany.mockResolvedValue(...)`)
 * داخل ملفات الاختبار، دون تكرار vi.mock في كل ملف.
 */
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
