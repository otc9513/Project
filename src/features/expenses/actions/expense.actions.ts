"use server";

import { revalidatePath } from "next/cache";
import { expenseService } from "../service/expense.service";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilterInput,
} from "../schema/expense.schema";

export async function listExpensesAction(input: Partial<ExpenseFilterInput> = {}) {
  return expenseService.list(input);
}

export async function createExpenseAction(input: CreateExpenseInput) {
  const expense = await expenseService.create(input);
  revalidatePath("/app/expenses");
  return expense;
}

export async function updateExpenseAction(input: UpdateExpenseInput) {
  const expense = await expenseService.update(input);
  revalidatePath("/app/expenses");
  return expense;
}

export async function deleteExpenseAction(id: string) {
  await expenseService.delete(id);
  revalidatePath("/app/expenses");
}
