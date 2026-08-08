import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceFilterInput,
} from "../schema/maintenance.schema";

export const maintenanceRepository = {
  async findMany(tenantId: string, filter: MaintenanceFilterInput) {
    const where: Prisma.MaintenanceRecordWhereInput = {
      tenantId,
      ...(filter.generatorId ? { generatorId: filter.generatorId } : {}),
      ...(filter.upcomingOnly ? { nextDueDate: { not: null, gte: new Date() } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.maintenanceRecord.findMany({
        where,
        include: { generator: { select: { name: true } } },
        orderBy: filter.upcomingOnly ? { nextDueDate: "asc" } : { date: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.maintenanceRecord.count({ where }),
    ]);

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  },

  findById(tenantId: string, id: string) {
    return prisma.maintenanceRecord.findFirst({
      where: { id, tenantId },
      include: { generator: { select: { name: true } } },
    });
  },

  create(tenantId: string, data: CreateMaintenanceInput) {
    return prisma.maintenanceRecord.create({ data: { ...data, tenantId } });
  },

  async update(tenantId: string, { id, ...data }: UpdateMaintenanceInput) {
    const result = await prisma.maintenanceRecord.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new Error("سجل الصيانة غير موجود أو لا يتبع مساحة العمل الحالية");
    }
    return prisma.maintenanceRecord.findFirstOrThrow({ where: { id, tenantId } });
  },

  /** يُستخدم لتذكيرات الصيانة القادمة خلال نافذة زمنية معيّنة (لوحة التحكم/الإشعارات) */
  findDueWithin(tenantId: string, days: number) {
    const upperBound = new Date();
    upperBound.setDate(upperBound.getDate() + days);
    return prisma.maintenanceRecord.findMany({
      where: { tenantId, nextDueDate: { not: null, gte: new Date(), lte: upperBound } },
      include: { generator: { select: { name: true } } },
      orderBy: { nextDueDate: "asc" },
    });
  },
};
