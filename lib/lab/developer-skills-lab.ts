/** ForgeOS Developer & Cloud Skills Lab — RC4.2. */

import {
  getSkillAuditLogs,
  getSkillTelemetry,
  getSkillHistory,
} from "@/lib/skills";
import { runGovernedSkillRequest } from "@/lib/skills-governance/pipeline";
import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import { getGovernanceHistory } from "@/lib/skills-governance/governance-history";
import type { GovernanceResult } from "@/lib/skills-governance/types";
import {
  DEVELOPER_SKILL_REGISTRY,
  DEVELOPER_PROVIDER_MODULES,
} from "@/lib/skills/developer/registry";
import {
  CLOUD_SKILL_REGISTRY,
  CLOUD_PROVIDER_MODULES,
} from "@/lib/skills/cloud/registry";
import { RC42_PROVIDER_MODULES } from "@/lib/skills/provider-router";
import type { SkillDefinition } from "@/lib/skills/types";
import type {
  DeveloperContainer,
  DeveloperDeployment,
  DeveloperProject,
  DeveloperRepository,
} from "@/lib/skills/developer/types";
import type { CloudDeployment, CloudResource } from "@/lib/skills/cloud/types";

export interface ProviderSection {
  skill: SkillDefinition;
  kind: "developer" | "cloud";
  actions: { id: string; name: string; risk: string }[];
  riskSample: { action: string; level: string; score: number };
}

export interface DeveloperSkillsLabSnapshot {
  providers: ProviderSection[];
  projects: DeveloperProject[];
  repositories: DeveloperRepository[];
  deployments: DeveloperDeployment[];
  containers: DeveloperContainer[];
  cloudResources: CloudResource[];
  cloudDeployments: CloudDeployment[];
  health: { total: number; healthy: number; sandbox: number };
  auditLogs: ReturnType<typeof getSkillAuditLogs>;
  telemetry: ReturnType<typeof getSkillTelemetry>;
  history: ReturnType<typeof getSkillHistory>;
  governanceHistory: ReturnType<typeof getGovernanceHistory>;
  sampleExecutions: Record<string, GovernanceResult | null>;
}

const RC42_IDS = RC42_PROVIDER_MODULES.map((m) => m.config.id);

const SAMPLE_ACTIONS: Record<string, string> = {
  github: "create_repository",
  gitlab: "create_project",
  docker: "build_image",
  vercel: "deploy_preview",
  cloudflare: "deploy_worker",
  supabase: "query_table",
  aws: "list_resources",
  azure: "list_resources",
  gcp: "list_services",
};

async function runSample(skillId: string, action: string, ventureId: string) {
  try {
    return await runGovernedSkillRequest({
      skillId,
      context: {
        ventureId,
        requestedBy: "cto",
        approvedBy: "ceo",
        action,
        payload: { sandbox: true },
      },
    });
  } catch {
    return null;
  }
}

function mockProjects(ventureId: string): DeveloperProject[] {
  return [
    { id: "proj-gh-1", name: "forgeos-core", provider: "github", ventureId, status: "active" },
    { id: "proj-gl-1", name: "forgeos/platform", provider: "gitlab", ventureId, status: "active" },
  ];
}

function mockRepositories(ventureId: string): DeveloperRepository[] {
  return [
    {
      id: "repo-1",
      name: "forgeos-app-factory",
      provider: "github",
      projectId: "proj-gh-1",
      defaultBranch: "main",
      visibility: "private",
    },
    {
      id: "repo-2",
      name: "forgeos-runtime",
      provider: "gitlab",
      projectId: "proj-gl-1",
      defaultBranch: "develop",
      visibility: "private",
    },
  ];
}

function mockDeployments(): DeveloperDeployment[] {
  return [
    {
      id: "dpl-001",
      provider: "vercel",
      environment: "preview",
      status: "success",
      url: "https://preview.forgeos.dev",
    },
    {
      id: "dpl-002",
      provider: "cloudflare",
      environment: "production",
      status: "success",
      url: "https://edge.forgeos.dev",
    },
  ];
}

function mockContainers(): DeveloperContainer[] {
  return [
    {
      id: "ctr-001",
      name: "forgeos-api",
      image: "forgeos/api:latest",
      status: "running",
      provider: "docker",
    },
    {
      id: "ctr-002",
      name: "forgeos-worker",
      image: "forgeos/worker:latest",
      status: "building",
      provider: "docker",
    },
  ];
}

function mockCloudResources(): CloudResource[] {
  return [
    {
      id: "aws-s3-1",
      name: "forgeos-assets",
      provider: "aws",
      type: "s3-bucket",
      region: "us-east-1",
      status: "active",
    },
    {
      id: "gcp-run-1",
      name: "forgeos-api",
      provider: "gcp",
      type: "cloud-run",
      region: "europe-west1",
      status: "active",
    },
    {
      id: "sb-proj-1",
      name: "forgeos-db",
      provider: "supabase",
      type: "postgres",
      region: "eu-west-1",
      status: "active",
    },
  ];
}

function mockCloudDeployments(): CloudDeployment[] {
  return [
    {
      id: "cd-001",
      provider: "vercel",
      service: "web",
      environment: "preview",
      status: "live",
      url: "https://preview.forgeos.dev",
    },
    {
      id: "cd-002",
      provider: "azure",
      service: "functions",
      environment: "staging",
      status: "pending",
    },
  ];
}

export async function runDeveloperSkillsLab(
  ventureId = "demo-venture-vandl"
): Promise<DeveloperSkillsLabSnapshot> {
  const allSkills = [...DEVELOPER_SKILL_REGISTRY, ...CLOUD_SKILL_REGISTRY];

  const providers: ProviderSection[] = RC42_PROVIDER_MODULES.map((mod) => {
    const skill = mod.registry;
    const kind = DEVELOPER_PROVIDER_MODULES.includes(mod) ? "developer" : "cloud";
    const sampleAction = SAMPLE_ACTIONS[skill.id] ?? mod.config.actions[0]?.id ?? "list";
    const risk = assessSkillRisk(skill.id, sampleAction);
    return {
      skill,
      kind,
      actions: mod.config.actions.map((a) => ({ id: a.id, name: a.name, risk: a.risk })),
      riskSample: { action: sampleAction, level: risk.level, score: risk.score },
    };
  });

  const sampleExecutions: Record<string, GovernanceResult | null> = {};
  for (const skillId of RC42_IDS) {
    const action = SAMPLE_ACTIONS[skillId] ?? "list";
    sampleExecutions[skillId] = await runSample(skillId, action, ventureId);
  }

  const healthy = allSkills.filter((s) => s.health === "healthy").length;
  const sandbox = allSkills.filter((s) => s.status === "sandbox").length;

  return {
    providers,
    projects: mockProjects(ventureId),
    repositories: mockRepositories(ventureId),
    deployments: mockDeployments(),
    containers: mockContainers(),
    cloudResources: mockCloudResources(),
    cloudDeployments: mockCloudDeployments(),
    health: { total: allSkills.length, healthy, sandbox },
    auditLogs: getSkillAuditLogs(ventureId).filter((l) => RC42_IDS.includes(l.skillId)),
    telemetry: getSkillTelemetry().filter((t) => RC42_IDS.includes(t.skillId)),
    history: getSkillHistory(ventureId).filter((h) => RC42_IDS.includes(h.skillId)),
    governanceHistory: getGovernanceHistory(ventureId).filter((h) =>
      RC42_IDS.includes(h.skillId)
    ),
    sampleExecutions,
  };
}
