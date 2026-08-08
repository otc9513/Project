import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CreateSubscriberInput,
  UpdateSubscriberInput,
  SubscriberFilterInput,
} from "../schema/subscriber.schema";

export const subscriberRepository = {
  async findMany(tenantId: string, filter: SubscriberFilterInput) {
    const where: Prisma.SubscriberWhereInput = {
      tenantId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.area ? { area: filter.area } : {}),
      ...(filter.search
        ? {
            OR: [
              { fullName: { contains: filter.search, mode: "insensitive" } },
              { phone: { contains: filter.search } },
              { subscriptionNo: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortDir },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.subscriber.count({ where }),
    ]);

    return { items, total, page: filter.page, pageSize: filter.pageSize };
  },

  findById(tenantId: string, id: string) {
    return prisma.subscriber.findFirst({
      where: { id, tenantId },
      include: {
        subscriptions: {
          include: { generator: true, amperePlan: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  findByPhone(tenantId: string, phone: string) {
    return prisma.subscriber.findFirst({ where: { tenantId, phone } });
  },

  create(tenantId: string, data: CreateSubscriberInput) {
    return prisma.subscriber.create({ data: { ...data, tenantId } });
  },

  async update(tenantId: string, { id, ...data }: UpdateSubscriberInput) {
    const result = await prisma.subscriber.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new Error("المشترك غير موجود أو لا يتبع مساحة العمل الحالية");
    }
    return prisma.subscriber.findFirstOrThrow({ where: { id, tenantId } });
  },

  async archive(tenantId: string, id: string) {
    const result = await prisma.subscriber.updateMany({
      where: { id, tenantId },
      data: { status: "CANCELLED" },
    });
    if (result.count === 0) {
      throw new Error("المشترك غير موجود أو لا يتبع مساحة العمل الحالية");
    }
  },

  countByStatus(tenantId: string) {
    return prisma.subscriber.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });
  },
};
