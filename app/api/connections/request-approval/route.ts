import { NextResponse } from "next/server";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import type { ConnectionProvider } from "@/lib/connections/shared/types";

const PROVIDER_SKILL_MAP: Record<ConnectionProvider, string> = {
  github: "github",
  supabase: "supabase",
  vercel: "vercel",
  cloudflare: "cloudflare",
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider, operation, ventureId, requestedBy, approvedBy } = body as {
    provider?: ConnectionProvider;
    operation?: string;
    ventureId?: string;
    requestedBy?: string;
    approvedBy?: string;
  };

  if (!provider || !PROVIDER_SKILL_MAP[provider]) {
    return NextResponse.json({ error: "Valid provider is required" }, { status: 400 });
  }
  if (!operation?.trim()) {
    return NextResponse.json({ error: "operation is required" }, { status: 400 });
  }

  const vid = ventureId ?? "demo-venture-vandl";
  const by = requestedBy ?? "cto";
  const skillId = PROVIDER_SKILL_MAP[provider];
  const action = operation.trim();

  const [{ assessSkillRisk }, { processApproval }, { getConnectionAuditLog }] = await Promise.all([
    import("@/lib/skills-governance/risk-engine"),
    import("@/lib/skills-governance/approval-engine"),
    import("@/lib/connections/security/connection-audit"),
  ]);

  const risk = assessSkillRisk(skillId, action);
  const approval = processApproval({
    skillId,
    ventureId: vid,
    requestedBy: by,
    action,
    riskLevel: risk.level,
    preApprovedBy: approvedBy,
  });

  return NextResponse.json(
    redactObject({
      approval,
      risk,
      message: approval.approved
        ? "Approval granted — dry-run execution allowed"
        : "Approval pending — production execution blocked",
      auditPreview: getConnectionAuditLog(vid).slice(0, 5),
    })
  );
}
