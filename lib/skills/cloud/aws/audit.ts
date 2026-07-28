/** AWS cloud skill — audit event shape (RC4.2). */

import type { ProviderAuditEvent } from "@/lib/skills/shared/provider-factory";
import { awsSkill } from "./module";

export function buildAwsAuditEvent(params: {
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: ProviderAuditEvent["outcome"];
}): ProviderAuditEvent {
  return awsSkill.buildAuditEvent(params);
}
