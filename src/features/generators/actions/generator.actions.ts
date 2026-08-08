"use server";

import { revalidatePath } from "next/cache";
import { generatorService } from "../service/generator.service";
import type { CreateGeneratorInput, UpdateGeneratorInput } from "../schema/generator.schema";

export async function listGeneratorsAction() {
  return generatorService.list();
}

export async function createGeneratorAction(input: CreateGeneratorInput) {
  const generator = await generatorService.create(input);
  revalidatePath("/app/generators");
  return generator;
}

export async function updateGeneratorAction(input: UpdateGeneratorInput) {
  const generator = await generatorService.update(input);
  revalidatePath("/app/generators");
  revalidatePath(`/app/generators/${input.id}`);
  return generator;
}

export async function archiveGeneratorAction(id: string) {
  await generatorService.archive(id);
  revalidatePath("/app/generators");
}
