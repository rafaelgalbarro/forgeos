/** Supabase cloud skill — audit event shape (RC4.2). */

import type { ProviderAuditEvent } from "@/lib/skills/shared/provider-factory";
import { supabaseSkill } from "./module";

export function buildSupabaseAuditEvent(params: {
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: ProviderAuditEvent["outcome"];
}): ProviderAuditEvent {
  return supabaseSkill.buildAuditEvent(params);
}
