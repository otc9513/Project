import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateFuelPurchaseInput,
  CreateFuelUsageInput,
  FuelFilterInput,
} from "../schema/fuel.schema";

function buildDateWhere(filter: FuelFilterInput): Prisma.DateTimeFilter | undefined {
  if (!filter.from && !filter.to) return undefined;
  return {
    ...(filter.from ? { gte: filter.from } : {}),
    ...(filter.to ? { lte: filter.to } : {}),
  };
}

export const fuelRepository = {
  purchases: {
    async findMany(tenantId: string, filter: FuelFilterInput) {
      const where: Prisma.FuelPurchaseWhereInput = {
        tenantId,
        ...(filter.generatorId ? { generatorId: filter.generatorId } : {}),
        ...(buildDateWhere(filter) ? { date: buildDateWhere(filter) } : {}),
      };
      const [items, total, totalCost] = await Promise.all([
        prisma.fuelPurchase.findMany({
          where,
          include: { generator: { select: { name: true } } },
          orderBy: { date: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
        prisma.fuelPurchase.count({ where }),
        prisma.fuelPurchase.aggregate({ where, _sum: { price: true, quantityLiters: true } }),
      ]);
      return {
        items,
        total,
        page: filter.page,
        pageSize: filter.pageSize,
        totalCost: totalCost._sum.price ?? 0,
        totalLiters: totalCost._sum.quantityLiters ?? 0,
      };
    },

    create(tenantId: string, data: CreateFuelPurchaseInput) {
      return prisma.fuelPurchase.create({ data: { ...data, tenantId } });
    },
  },

  usage: {
    async findMany(tenantId: string, filter: FuelFilterInput) {
      const where: Prisma.FuelUsageWhereInput = {
        tenantId,
        ...(filter.generatorId ? { generatorId: filter.generatorId } : {}),
        ...(buildDateWhere(filter) ? { date: buildDateWhere(filter) } : {}),
      };
      const [items, total, totalLiters] = await Promise.all([
        prisma.fuelUsage.findMany({
          where,
          include: { generator: { select: { name: true } } },
          orderBy: { date: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
        prisma.fuelUsage.count({ where }),
        prisma.fuelUsage.aggregate({ where, _sum: { quantityLiters: true } }),
      ]);
      return {
        items,
        total,
        page: filter.page,
        pageSize: filter.pageSize,
        totalLiters: totalLiters._sum.quantityLiters ?? 0,
      };
    },

    create(tenantId: string, data: CreateFuelUsageInput) {
      return prisma.fuelUsage.create({ data: { ...data, tenantId } });
    },
  },
};
