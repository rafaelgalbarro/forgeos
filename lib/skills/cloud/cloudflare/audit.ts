/** Cloudflare cloud skill — audit event shape (RC4.2). */

import type { ProviderAuditEvent } from "@/lib/skills/shared/provider-factory";
import { cloudflareSkill } from "./module";

export function buildCloudflareAuditEvent(params: {
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: ProviderAuditEvent["outcome"];
}): ProviderAuditEvent {
  return cloudflareSkill.buildAuditEvent(params);
}
