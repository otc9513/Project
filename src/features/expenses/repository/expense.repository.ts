import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilterInput,
} from "../schema/expense.schema";

export const expenseRepository = {
  async findMany(tenantId: string, filter: ExpenseFilterInput) {
    const where: Prisma.ExpenseWhereInput = {
      tenantId,
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.from || filter.to
        ? {
            date: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };

    const [items, total, totalAmount] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      items,
      total,
      page: filter.page,
      pageSize: filter.pageSize,
      totalAmount: totalAmount._sum.amount ?? 0,
    };
  },

  findById(tenantId: string, id: string) {
    return prisma.expense.findFirst({ where: { id, tenantId } });
  },

  create(tenantId: string, createdById: string, data: CreateExpenseInput) {
    return prisma.expense.create({
      data: { ...data, tenantId, createdById },
    });
  },

  async update(tenantId: string, { id, ...data }: UpdateExpenseInput) {
    const result = await prisma.expense.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new Error("المصروف غير موجود أو لا يتبع مساحة العمل الحالية");
    }
    return prisma.expense.findFirstOrThrow({ where: { id, tenantId } });
  },

  async delete(tenantId: string, id: string) {
    const result = await prisma.expense.deleteMany({ where: { id, tenantId } });
    if (result.count === 0) {
      throw new Error("المصروف غير موجود أو لا يتبع مساحة العمل الحالية");
    }
  },

  sumByCategory(tenantId: string, from?: Date, to?: Date) {
    return prisma.expense.groupBy({
      by: ["category"],
      where: {
        tenantId,
        ...(from || to
          ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      _sum: { amount: true },
    });
  },
};
