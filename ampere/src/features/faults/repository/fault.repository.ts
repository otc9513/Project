import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateFaultInput, FaultFilterInput } from "../schema/fault.schema";

export const faultRepository = {
  async findMany(tenantId: string, filter: FaultFilterInput) {
    const where: Prisma.FaultWhereInput = {
      tenantId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.generatorId ? { generatorId: filter.generatorId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.fault.findMany({
        where,
        include: { generator: { select: { name: true } } },
        // الأولوية العالية والأقدم أولًا كي لا تُنسى الأعطال الحرجة
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.fault.count({ where }),
    ]);

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  },

  findById(tenantId: string, id: string) {
    return prisma.fault.findFirst({
      where: { id, tenantId },
      include: {
        generator: { select: { name: true } },
        updates: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
  },

  create(tenantId: string, data: CreateFaultInput) {
    return prisma.fault.create({ data: { ...data, tenantId } });
  },

  async assign(tenantId: string, id: string, assignedToId: string) {
    const result = await prisma.fault.updateMany({
      where: { id, tenantId },
      data: { assignedToId, status: "IN_PROGRESS" },
    });
    if (result.count === 0) {
      throw new Error("العطل غير موجود أو لا يتبع مساحة العمل الحالية");
    }
    return prisma.fault.findFirstOrThrow({ where: { id, tenantId } });
  },

  async updateStatus(tenantId: string, id: string, status: "NEW" | "IN_PROGRESS" | "COMPLETED") {
    const result = await prisma.fault.updateMany({
      where: { id, tenantId },
      data: { status },
    });
    if (result.count === 0) {
      throw new Error("العطل غير موجود أو لا يتبع مساحة العمل الحالية");
    }
    return prisma.fault.findFirstOrThrow({ where: { id, tenantId } });
  },

  async addUpdate(tenantId: string, faultId: string, userId: string, note: string) {
    // نتحقق أولًا أن العطل يتبع فعلاً هذا المستأجر قبل إضافة تحديث عليه
    const fault = await prisma.fault.findFirst({ where: { id: faultId, tenantId } });
    if (!fault) {
      throw new Error("العطل غير موجود أو لا يتبع مساحة العمل الحالية");
    }
    return prisma.faultUpdate.create({ data: { faultId, userId, note } });
  },

  countByStatus(tenantId: string) {
    return prisma.fault.groupBy({ by: ["status"], where: { tenantId }, _count: true });
  },
};
