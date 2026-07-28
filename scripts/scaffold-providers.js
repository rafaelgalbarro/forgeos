/** Generate provider skill folder files (RC4.2 bootstrap). */
const fs = require("fs");
const path = require("path");

const providers = [
  { dir: "developer/gitlab", id: "gitlab", prefix: "Gitlab", adapter: "gitlab-adapter.ts", fn: "Gitlab", exportFn: "Gitlab" },
  { dir: "developer/docker", id: "docker", prefix: "Docker", adapter: "docker-adapter.ts", fn: "Docker", exportFn: "Docker" },
  { dir: "cloud/vercel", id: "vercel", prefix: "Vercel", adapter: "vercel-adapter.ts", fn: "Vercel", exportFn: "Vercel" },
  { dir: "cloud/cloudflare", id: "cloudflare", prefix: "Cloudflare", adapter: "cloudflare-adapter.ts", fn: "Cloudflare", exportFn: "Cloudflare" },
  { dir: "cloud/supabase", id: "supabase", prefix: "Supabase", adapter: "supabase-adapter.ts", fn: "Supabase", exportFn: "Supabase" },
  { dir: "cloud/aws", id: "aws", prefix: "Aws", adapter: "aws-adapter.ts", fn: "Aws", exportFn: "Aws" },
  { dir: "cloud/azure", id: "azure", prefix: "Azure", adapter: "azure-adapter.ts", fn: "Azure", exportFn: "Azure" },
  { dir: "cloud/gcp", id: "gcp", prefix: "Gcp", adapter: "gcp-adapter.ts", fn: "Gcp", exportFn: "Gcp" },
];

const root = path.join(__dirname, "..");

for (const p of providers) {
  const base = path.join(root, p.dir);
  const varName = `${p.id}Skill`;
  const configName = `${p.prefix.toUpperCase()}_CONFIG`.replace("GITLAB", "GITLAB").replace("AWS", "AWS");

  const configConst = p.id === "gitlab" ? "GITLAB_CONFIG" :
    p.id === "docker" ? "DOCKER_CONFIG" :
    p.id === "vercel" ? "VERCEL_CONFIG" :
    p.id === "cloudflare" ? "CLOUDFLARE_CONFIG" :
    p.id === "supabase" ? "SUPABASE_CONFIG" :
    p.id === "aws" ? "AWS_CONFIG" :
    p.id === "azure" ? "AZURE_CONFIG" : "GCP_CONFIG";

  const upper = p.prefix.toUpperCase();

  fs.writeFileSync(path.join(base, "module.ts"), `/** ${p.prefix} skill — bootstrapped module (RC4.2). */

import { bootstrapProvider } from "@/lib/skills/shared/bootstrap-provider";
import { ${configConst} } from "./types";

export const ${varName} = bootstrapProvider(${configConst});
`);

  fs.writeFileSync(path.join(base, "registry.ts"), `import { ${varName} } from "./module";
export const ${upper}_REGISTRY = ${varName}.registry;
`);

  fs.writeFileSync(path.join(base, "permissions.ts"), `import { ${varName} } from "./module";
export const ${upper}_PERMISSIONS = ${varName}.permissions;
`);

  fs.writeFileSync(path.join(base, "policies.ts"), `import { ${varName} } from "./module";
export const ${upper}_POLICIES = ${varName}.policies;
`);

  fs.writeFileSync(path.join(base, "risk.ts"), `import type { RiskLevel } from "@/lib/skills-governance/types";
import { ${varName} } from "./module";
export function assess${p.fn}ActionRisk(action: string): RiskLevel {
  return ${varName}.assessActionRisk(action);
}
`);

  fs.writeFileSync(path.join(base, "rollback.ts"), `import type { RollbackPlan } from "@/lib/skills-governance/types";
import { ${varName} } from "./module";
export function build${p.fn}RollbackPlan(action: string): RollbackPlan {
  return ${varName}.buildRollbackPlan(action);
}
`);

  fs.writeFileSync(path.join(base, "telemetry.ts"), `import { ${varName} } from "./module";
export const ${upper}_TELEMETRY = ${varName}.telemetryMeta;
`);

  fs.writeFileSync(path.join(base, "audit.ts"), `import type { ProviderAuditEvent } from "@/lib/skills/shared/provider-factory";
import { ${varName} } from "./module";
export function build${p.fn}AuditEvent(params: {
  action: string;
  ventureId: string;
  requestedBy: string;
  outcome: ProviderAuditEvent["outcome"];
}): ProviderAuditEvent {
  return ${varName}.buildAuditEvent(params);
}
`);

  fs.writeFileSync(path.join(base, "mock-executor.ts"), `import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { ${varName} } from "./module";
export function execute${p.fn}Mock(action: string, context: SkillContext): SkillMockResult {
  return ${varName}.executeMock(action, context);
}
`);

  fs.writeFileSync(path.join(base, "sandbox.ts"), `import { ${varName} } from "./module";
export const ${upper}_SANDBOX = ${varName}.sandbox;
`);

  fs.writeFileSync(path.join(base, p.adapter), `import type { SkillContext } from "@/lib/skills/types";
import { ${varName} } from "./module";
export function route${p.fn}Skill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return ${varName}.adapter.route({
    skillId: "${p.id}",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
`);

  fs.writeFileSync(path.join(base, "index.ts"), `export * from "./types";
export { ${varName} } from "./module";
export { ${upper}_REGISTRY } from "./registry";
export { ${upper}_PERMISSIONS } from "./permissions";
export { ${upper}_POLICIES } from "./policies";
export { assess${p.fn}ActionRisk } from "./risk";
export { build${p.fn}RollbackPlan } from "./rollback";
export { ${upper}_TELEMETRY } from "./telemetry";
export { build${p.fn}AuditEvent } from "./audit";
export { execute${p.fn}Mock } from "./mock-executor";
export { ${upper}_SANDBOX } from "./sandbox";
export { route${p.fn}Skill } from "./${p.adapter.replace(".ts", "")}";
`);
}

console.log("Generated", providers.length, "provider modules");
