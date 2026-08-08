"use server";

import { revalidatePath } from "next/cache";
import { faultService } from "../service/fault.service";
import type {
  CreateFaultInput,
  AssignFaultInput,
  UpdateFaultStatusInput,
  AddFaultUpdateInput,
  FaultFilterInput,
} from "../schema/fault.schema";

export async function listFaultsAction(input: Partial<FaultFilterInput> = {}) {
  return faultService.list(input);
}

export async function getFaultAction(id: string) {
  return faultService.getById(id);
}

export async function createFaultAction(input: CreateFaultInput) {
  const fault = await faultService.create(input);
  revalidatePath("/app/faults");
  return fault;
}

export async function assignFaultAction(input: AssignFaultInput) {
  const fault = await faultService.assign(input);
  revalidatePath("/app/faults");
  revalidatePath(`/app/faults/${input.id}`);
  return fault;
}

export async function updateFaultStatusAction(input: UpdateFaultStatusInput) {
  const fault = await faultService.updateStatus(input);
  revalidatePath("/app/faults");
  revalidatePath(`/app/faults/${input.id}`);
  return fault;
}

export async function addFaultUpdateAction(input: AddFaultUpdateInput) {
  const update = await faultService.addUpdate(input);
  revalidatePath(`/app/faults/${input.faultId}`);
  return update;
}
