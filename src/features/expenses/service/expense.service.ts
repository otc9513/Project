import "server-only";
import { requireTenantContext, requireRole } from "@/lib/tenant/context";
import { recordAuditEntry } from "@/lib/audit/audit-log.service";
import { expenseRepository } from "../repository/expense.repository";
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseFilterSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
  type ExpenseFilterInput,
} from "../schema/expense.schema";

/**
 * حسب المواصفات: المحاسب مسؤول عن المصاريف، لكن المالك والمدير يحتفظان
 * دائمًا بصلاحية الوصول الكامل. العرض متاح لكل من لديه عضوية في المستأجر
 * (مثلاً المالك يحتاج رؤية المصاريف حتى لو لم يُدخلها بنفسه).
 */
const MUTATE_ROLES = ["OWNER", "ADMIN", "ACCOUNTANT"] as const;

export const expenseService = {
  async list(input: Partial<ExpenseFilterInput>) {
    const ctx = await requireTenantContext();
    const filter = expenseFilterSchema.parse(input);
    return expenseRepository.findMany(ctx.tenantId, filter);
  },

  async getById(id: string) {
    const ctx = await requireTenantContext();
    const expense = await expenseRepository.findById(ctx.tenantId, id);
    if (!expense) {
      throw new Error("المصروف غير موجود");
    }
    return expense;
  },

  async create(input: CreateExpenseInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MUTATE_ROLES]);

    const data = createExpenseSchema.parse(input);
    const expense = await expenseRepository.create(ctx.tenantId, ctx.userId, data);

    await recordAuditEntry({
      ctx,
      action: "expense.created",
      entityType: "Expense",
      entityId: expense.id,
      changes: { after: data },
    });

    return expense;
  },

  async update(input: UpdateExpenseInput) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MUTATE_ROLES]);

    const data = updateExpenseSchema.parse(input);
    const before = await expenseRepository.findById(ctx.tenantId, data.id);
    if (!before) {
      throw new Error("المصروف غير موجود");
    }

    const expense = await expenseRepository.update(ctx.tenantId, data);

    await recordAuditEntry({
      ctx,
      action: "expense.updated",
      entityType: "Expense",
      entityId: expense.id,
      changes: { before, after: expense },
    });

    return expense;
  },

  async delete(id: string) {
    const ctx = await requireTenantContext();
    requireRole(ctx, [...MUTATE_ROLES]);

    const before = await expenseRepository.findById(ctx.tenantId, id);
    if (!before) {
      throw new Error("المصروف غير موجود");
    }

    await expenseRepository.delete(ctx.tenantId, id);

    await recordAuditEntry({
      ctx,
      action: "expense.deleted",
      entityType: "Expense",
      entityId: id,
      changes: { before },
    });
  },

  async summaryByCategory(from?: Date, to?: Date) {
    const ctx = await requireTenantContext();
    return expenseRepository.sumByCategory(ctx.tenantId, from, to);
  },
};
