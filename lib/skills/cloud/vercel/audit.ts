/** Vercel cloud skill — audit event shape (RC4.2). */

import type { ProviderAuditEvent } from "@/lib/skills/shared/provider-factory";
import { vercelSkill } from "./module";

export function buildVercelAuditEvent(params: {
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: ProviderAuditEvent["outcome"];
}): ProviderAuditEvent {
  return vercelSkill.buildAuditEvent(params);
}
