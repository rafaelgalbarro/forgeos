/** Azure cloud skill — audit event shape (RC4.2). */

import type { ProviderAuditEvent } from "@/lib/skills/shared/provider-factory";
import { azureSkill } from "./module";

export function buildAzureAuditEvent(params: {
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: ProviderAuditEvent["outcome"];
}): ProviderAuditEvent {
  return azureSkill.buildAuditEvent(params);
}
