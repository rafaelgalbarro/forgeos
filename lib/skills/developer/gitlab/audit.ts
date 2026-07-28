/** GitLab developer skill — audit event shape (RC4.2). */

import type { ProviderAuditEvent } from "@/lib/skills/shared/provider-factory";
import { gitlabSkill } from "./module";

export function buildGitlabAuditEvent(params: {
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: ProviderAuditEvent["outcome"];
}): ProviderAuditEvent {
  return gitlabSkill.buildAuditEvent(params);
}
