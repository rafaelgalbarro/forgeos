/** ForgeOS Universal Skill Store — aggregate registry (RC4.8). */

import { MESH_DEPARTMENTS } from "@/lib/executive-mesh/departments";
import { OFFICIAL_ARTIFACTS } from "@/lib/build-platform/build-registry/artifact-registry";
import { OFFICIAL_TEMPLATES } from "@/lib/build-platform/build-registry/template-registry";
import { OFFICIAL_PROVIDERS } from "@/lib/build-platform/build-registry/provider-registry";
import { OFFICIAL_WORKERS } from "@/lib/runtime/workers/worker-factory";
import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import { listAllSkills } from "@/lib/skills/registry";
import { ALL_PRODUCTIVITY_CONFIGS } from "@/lib/skills/productivity/provider-configs";
import { MARKETING_PROVIDER_CONFIGS } from "@/lib/skills/marketing/providers-config";
import { GITHUB_CONFIG } from "@/lib/skills/developer/github/types";
import { GITLAB_CONFIG } from "@/lib/skills/developer/gitlab/types";
import { DOCKER_CONFIG } from "@/lib/skills/developer/docker/types";
import { VERCEL_CONFIG } from "@/lib/skills/cloud/vercel/types";
import { CLOUDFLARE_CONFIG } from "@/lib/skills/cloud/cloudflare/types";
import { SUPABASE_CONFIG } from "@/lib/skills/cloud/supabase/types";
import { AWS_CONFIG } from "@/lib/skills/cloud/aws/types";
import { AZURE_CONFIG } from "@/lib/skills/cloud/azure/types";
import { GCP_CONFIG } from "@/lib/skills/cloud/gcp/types";
import { CRM_SKILL } from "@/lib/skills/business/crm/registry";
import { ERP_SKILL } from "@/lib/skills/business/erp/registry";
import { ACCOUNTING_SKILL } from "@/lib/skills/business/accounting/registry";
import { PAYMENTS_SKILL } from "@/lib/skills/business/payments/registry";
import { CONTRACTS_SKILL } from "@/lib/skills/business/contracts/registry";
import { BILLING_SKILL } from "@/lib/skills/business/billing/registry";
import { INVOICES_SKILL } from "@/lib/skills/business/invoices/registry";
import { CUSTOMERS_SKILL } from "@/lib/skills/business/customers/registry";
import { ANALYTICS_SKILL_REGISTRY } from "@/lib/skills/analytics/registry";
import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";
import type {
  BuildPack,
  DepartmentPack,
  KnowledgePack,
  PromptPack,
  ProviderListing,
  SkillListing,
  StoreCategory,
  StoreItem,
  TemplatePack,
  WorkerPack,
} from "./types";
import { skillToListing as toListing } from "./types";
import { buildAllDependencyGraphs } from "./dependencies";
import { buildAllVersions } from "./versions";

const NOW = "2026-07-06T00:00:00.000Z";

const PROMPT_PACKS = [
  {
    id: "pack-ceo-briefing",
    name: "CEO Briefing Prompts",
    useCases: ["daily-brief", "board-prep", "risk-summary"],
    departments: ["ceo", "coo"] as const,
  },
  {
    id: "pack-growth-prompts",
    name: "Growth Marketing Prompts",
    useCases: ["campaign-copy", "seo-audit", "funnel-analysis"],
    departments: ["cmo", "growth"] as const,
  },
  {
    id: "pack-engineering-prompts",
    name: "Engineering Prompts",
    useCases: ["code-review", "architecture-rfc", "incident-postmortem"],
    departments: ["cto", "architecture"] as const,
  },
  {
    id: "pack-product-prompts",
    name: "Product Discovery Prompts",
    useCases: ["user-interview", "prd-draft", "competitive-analysis"],
    departments: ["cpo", "product"] as const,
  },
] as const;

const KNOWLEDGE_PACKS = [
  {
    id: "pack-venture-playbook",
    name: "Venture Playbook",
    topics: ["discovery", "mvp", "launch"],
    articles: 24,
    skills: ["productivity-knowledge"],
  },
  {
    id: "pack-compliance-guide",
    name: "Compliance Guide",
    topics: ["gdpr", "contracts", "security"],
    articles: 18,
    skills: ["contracts", "docusign"],
  },
  {
    id: "pack-growth-playbook",
    name: "Growth Playbook",
    topics: ["acquisition", "retention", "analytics"],
    articles: 32,
    skills: ["ga4", "posthog", "seo"],
  },
] as const;

function providerConfigToSkill(config: ProviderModuleConfig, source: string): SkillListing {
  const listing = toListing(
    {
      id: config.id,
      name: config.name,
      category: config.category,
      version: "1.0.0",
      provider: config.provider,
      requiredCredentials: config.credential ? [config.credential] : [],
      estimatedCostPerCall: 0.002,
      estimatedLatencyMs: 400,
      permissions: [`${config.id}:execute`, ...config.actions.map((a) => `${config.id}:${a.id}`)],
      risks: config.risks,
      capability: config.capability,
      status: config.status ?? "sandbox",
      health: "healthy",
    },
    { source, domain: source.split("/")[2] }
  );
  try {
    listing.governanceRisk = assessSkillRisk(config.id, config.actions[0]?.id ?? "read").level;
  } catch {
    /* governance optional at build time */
  }
  return listing;
}

function buildCoreSkills(): SkillListing[] {
  return listAllSkills().map((s) => {
    const listing = toListing(s);
    try {
      listing.governanceRisk = assessSkillRisk(s.id, s.capability).level;
    } catch {
      /* skip */
    }
    return listing;
  });
}

function buildDomainSkills(): SkillListing[] {
  const configs: { config: ProviderModuleConfig; source: string }[] = [
    { config: GITHUB_CONFIG, source: "lib/skills/developer" },
    { config: GITLAB_CONFIG, source: "lib/skills/developer" },
    { config: DOCKER_CONFIG, source: "lib/skills/developer" },
    { config: VERCEL_CONFIG, source: "lib/skills/cloud" },
    { config: CLOUDFLARE_CONFIG, source: "lib/skills/cloud" },
    { config: SUPABASE_CONFIG, source: "lib/skills/cloud" },
    { config: AWS_CONFIG, source: "lib/skills/cloud" },
    { config: AZURE_CONFIG, source: "lib/skills/cloud" },
    { config: GCP_CONFIG, source: "lib/skills/cloud" },
  ];

  const productivity = ALL_PRODUCTIVITY_CONFIGS.map((c) =>
    toListing(
      {
        id: c.id,
        name: c.name,
        category: "documents",
        version: "1.0.0",
        provider: c.provider,
        requiredCredentials: c.permissions?.filter((p) => p.includes("TOKEN") || p.includes("KEY")) ?? [],
        estimatedCostPerCall: 0.001,
        estimatedLatencyMs: 350,
        permissions: c.permissions,
        risks: c.risks,
        capability: c.capability,
        status: "sandbox",
        health: "healthy",
      },
      { source: "lib/skills/productivity", domain: "productivity" }
    )
  );

  const marketing = MARKETING_PROVIDER_CONFIGS.map((c) =>
    toListing(
      {
        id: c.id,
        name: c.name,
        category: "marketing",
        version: "1.0.0",
        provider: c.provider,
        requiredCredentials: [],
        estimatedCostPerCall: c.estimatedCostPerCall ?? 0.002,
        estimatedLatencyMs: 400,
        permissions: [`${c.id}:execute`, ...c.actions.map((a) => `${c.id}:${a.id}`)],
        risks: c.risks,
        capability: c.capability,
        status: "sandbox",
        health: "healthy",
      },
      { source: "lib/skills/marketing", domain: c.domain }
    )
  );

  const business = [
    CRM_SKILL,
    ERP_SKILL,
    ACCOUNTING_SKILL,
    PAYMENTS_SKILL,
    CONTRACTS_SKILL,
    BILLING_SKILL,
    INVOICES_SKILL,
    CUSTOMERS_SKILL,
  ].map((s) => toListing(s, { source: "lib/skills/business", domain: "business" }));

  const analytics = ANALYTICS_SKILL_REGISTRY.map((s) =>
    toListing(s, { source: "lib/skills/analytics", domain: "analytics" })
  );

  const providerSkills = configs.map(({ config, source }) => providerConfigToSkill(config, source));

  return [...providerSkills, ...productivity, ...marketing, ...business, ...analytics];
}

function dedupeSkills(skills: SkillListing[]): SkillListing[] {
  const map = new Map<string, SkillListing>();
  for (const s of skills) {
    const existing = map.get(s.id);
    if (!existing || s.source.includes("developer") || s.source.includes("cloud")) {
      map.set(s.id, s);
    }
  }
  return [...map.values()];
}

function buildDepartments(skills: SkillListing[]): DepartmentPack[] {
  return MESH_DEPARTMENTS.map((d) => ({
    id: `dept-${d.id}`,
    name: d.label,
    category: "departments" as const,
    version: "1.0.0",
    description: `${d.role} — ${d.specialties.join(", ")}`,
    tags: ["department", ...d.specialties],
    source: "lib/executive-mesh/departments",
    updatedAt: NOW,
    status: "active" as const,
    departmentId: d.id,
    role: d.role,
    reportsTo: d.reportsTo,
    specialties: d.specialties,
    boardSeat: d.boardSeat ?? false,
    includedSkills: skills
      .filter((s) => s.permissions.some((p) => p.includes(d.id)) || s.tags.includes(d.id))
      .slice(0, 5)
      .map((s) => s.id),
  }));
}

function buildWorkers(): WorkerPack[] {
  return OFFICIAL_WORKERS.map((w) => ({
    id: `worker-${w.id}`,
    name: w.name,
    category: "workers" as const,
    version: w.version,
    description: w.description,
    tags: ["worker", w.department, ...w.capabilities.map((c) => c.id)],
    source: "lib/runtime/workers/worker-factory",
    updatedAt: NOW,
    status: "active" as const,
    workerId: w.id,
    department: w.department,
    capabilities: w.capabilities.map((c) => c.id),
    supportedTasks: w.supportedTasks,
    priority: w.priority,
  }));
}

function buildTemplates(): TemplatePack[] {
  return OFFICIAL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    category: "templates" as const,
    version: t.version,
    description: t.description,
    tags: t.tags ?? [t.category ?? "template"],
    source: "lib/build-platform/build-registry/template-registry",
    updatedAt: t.updatedAt,
    status: t.status === "stable" ? "active" : t.status === "beta" ? "beta" : "sandbox",
    templateCategory: t.category ?? "general",
    capabilities: t.capabilities.map((c) => c.id),
  }));
}

function buildBuildPacks(): BuildPack[] {
  const artifacts = OFFICIAL_ARTIFACTS.map(
    (a): BuildPack => ({
      id: a.id,
      name: a.name,
      category: "build-packs",
      version: a.version,
      description: a.description,
      tags: a.tags ?? ["artifact"],
      source: "lib/build-platform/build-registry/artifact-registry",
      updatedAt: a.updatedAt,
      status: a.status === "stable" ? "active" : "beta",
      artifactType: a.type,
      buildCategory: a.category ?? "general",
      capabilities: a.capabilities.map((c) => c.id),
    })
  );

  const buildProviders = OFFICIAL_PROVIDERS.slice(0, 6).map(
    (p): BuildPack => ({
      id: `build-${p.id}`,
      name: `${p.name} Build Pack`,
      category: "build-packs",
      version: p.version,
      description: p.description,
      tags: p.tags ?? ["build-provider"],
      source: "lib/build-platform/build-registry/provider-registry",
      updatedAt: p.updatedAt,
      status: p.status === "stable" ? "active" : "beta",
      artifactType: "provider",
      buildCategory: p.category ?? "build",
      capabilities: p.capabilities.map((c) => c.id),
    })
  );

  return [...artifacts, ...buildProviders];
}

function buildKnowledgePacks(): KnowledgePack[] {
  return KNOWLEDGE_PACKS.map((k) => ({
    id: k.id,
    name: k.name,
    category: "knowledge-packs" as const,
    version: "1.0.0",
    description: `Knowledge pack: ${k.topics.join(", ")}`,
    tags: ["knowledge", ...k.topics],
    source: "lib/skills-store/registry",
    updatedAt: NOW,
    status: "active" as const,
    topics: [...k.topics],
    articleCount: k.articles,
    linkedSkills: [...k.skills],
  }));
}

function buildPromptPacks(): PromptPack[] {
  return PROMPT_PACKS.map((p) => ({
    id: p.id,
    name: p.name,
    category: "prompt-packs" as const,
    version: "1.0.0",
    description: `Prompt pack for ${p.useCases.join(", ")}`,
    tags: ["prompts", ...p.useCases],
    source: "lib/skills-store/registry",
    updatedAt: NOW,
    status: "active" as const,
    promptCount: p.useCases.length * 5,
    useCases: [...p.useCases],
    linkedDepartments: [...p.departments],
  }));
}

function buildProviders(skills: SkillListing[]): ProviderListing[] {
  const byProvider = new Map<string, SkillListing[]>();
  for (const s of skills) {
    const list = byProvider.get(s.provider) ?? [];
    list.push(s);
    byProvider.set(s.provider, list);
  }

  return [...byProvider.entries()].map(([providerId, list]) => ({
    id: `provider-${providerId}`,
    name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
    category: "providers" as const,
    version: "1.0.0",
    description: `${list.length} skills from ${providerId}`,
    tags: ["provider", ...new Set(list.map((s) => s.skillCategory))],
    source: "lib/skills-store/registry",
    updatedAt: NOW,
    status: "active" as const,
    providerId,
    skillCount: list.length,
    domains: [...new Set(list.map((s) => s.domain ?? s.skillCategory))],
    credentialKeys: [...new Set(list.flatMap((s) => s.requiredCredentials))],
  }));
}

let cachedCatalog: StoreItem[] | null = null;

export function buildStoreCatalog(): StoreItem[] {
  if (cachedCatalog) return cachedCatalog;

  const coreSkills = buildCoreSkills();
  const domainSkills = buildDomainSkills();
  const skills = dedupeSkills([...coreSkills, ...domainSkills]);

  const baseItems: StoreItem[] = [
    ...skills,
    ...buildDepartments(skills),
    ...buildWorkers(),
    ...buildTemplates(),
    ...buildBuildPacks(),
    ...buildKnowledgePacks(),
    ...buildPromptPacks(),
    ...buildProviders(skills),
  ];

  const versions = buildAllVersions(baseItems);
  const depGraphs = buildAllDependencyGraphs(baseItems);

  cachedCatalog = [...baseItems, ...versions, ...depGraphs];
  return cachedCatalog;
}

export function getStoreItemById(id: string): StoreItem | undefined {
  return buildStoreCatalog().find((i) => i.id === id);
}

export function countByCategory(): Record<StoreCategory, number> {
  const counts = {} as Record<StoreCategory, number>;
  const categories: StoreCategory[] = [
    "skills",
    "departments",
    "workers",
    "templates",
    "knowledge-packs",
    "build-packs",
    "prompt-packs",
    "providers",
    "versions",
    "dependencies",
  ];
  for (const c of categories) counts[c] = 0;
  for (const item of buildStoreCatalog()) {
    counts[item.category]++;
  }
  return counts;
}

export function resetStoreCatalogCache(): void {
  cachedCatalog = null;
}
