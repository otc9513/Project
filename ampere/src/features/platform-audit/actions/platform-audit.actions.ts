"use server";

import { platformAuditService } from "../service/platform-audit.service";
import type { ListPlatformAuditInput } from "../repository/platform-audit.repository";

export async function listPlatformAuditLogAction(input: ListPlatformAuditInput) {
  return platformAuditService.list(input);
}
