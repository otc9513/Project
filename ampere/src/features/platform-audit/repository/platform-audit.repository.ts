import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface ListPlatformAuditInput {
  tenantId?: string;
  userId?: string;
  action?: string;
  /** true = فقط إجراءات فريق تشغيل المنصة (action تبدأ بـ "platform."). false = فقط إجراءات داخل المستأجرين. undefined = الكل. */
  platformOnly?: boolean;
  page: number;
  pageSize: number;
}

export const platformAuditRepository = {
  async findMany(input: ListPlatformAuditInput) {
    const where: Prisma.AuditLogWhereInput = {
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.action ? { action: { contains: input.action } } : {}),
      ...(input.platformOnly === true ? { action: { startsWith: "platform." } } : {}),
      ...(input.platformOnly === false ? { NOT: { action: { startsWith: "platform." } } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          tenant: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: input.page, pageSize: input.pageSize };
  },
};
