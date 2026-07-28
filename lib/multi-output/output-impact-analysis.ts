/** PROGRAM 5390 — Impact analysis before decision changes. */

import type { MultiOutputKind, OutputImpactResult } from "./types";
import { getTransitiveDependents } from "./output-dependency-graph";
import { ALL_OUTPUT_KINDS } from "./types";

export type ChangeScenario =
  | "pricing"
  | "target_customer"
  | "remove_mobile"
  | "add_supervisor_role"
  | "visual_identity"
  | "deploy_provider";

interface ScenarioConfig {
  changeType: string;
  description: string;
  directAffected: MultiOutputKind[];
  files: string[];
  risks: string[];
  estimatedMinutes: number;
  requiresApproval: boolean;
}

const SCENARIO_MAP: Record<ChangeScenario, ScenarioConfig> = {
  pricing: {
    changeType: "PRICING",
    description: "Cambio en modelo de precios o tiers",
    directAffected: ["WEBSITE", "WEB_APP", "INVESTOR", "GTM"],
    files: [
      "shared-context/pricing.json",
      "apps/website/components/PricingTable.tsx",
      "apps/web/features/billing/",
      "investor/financial-model.xlsx",
      "gtm/pricing-strategy.md",
    ],
    risks: ["Inconsistencia entre web y app", "Modelo financiero desactualizado"],
    estimatedMinutes: 25,
    requiresApproval: true,
  },
  target_customer: {
    changeType: "TARGET_CUSTOMER",
    description: "Cambio de cliente objetivo o ICP",
    directAffected: ["VENTURE", "WEBSITE", "GTM", "INVESTOR"],
    files: [
      "shared-context/company-identity.json",
      "apps/website/copy/hero.md",
      "gtm/messaging.md",
      "investor/market-slide.md",
    ],
    risks: ["Messaging desalineado", "KPIs de mercado incorrectos"],
    estimatedMinutes: 30,
    requiresApproval: true,
  },
  remove_mobile: {
    changeType: "REMOVE_MOBILE",
    description: "Eliminar app móvil del scope",
    directAffected: ["MOBILE"],
    files: ["apps/mobile/"],
    risks: ["Usuarios de campo sin acceso móvil"],
    estimatedMinutes: 5,
    requiresApproval: false,
  },
  add_supervisor_role: {
    changeType: "ADD_ROLE",
    description: "Añadir rol supervisor con permisos",
    directAffected: ["BACKEND", "API", "WEB_APP", "DATABASE"],
    files: [
      "shared-context/users.json",
      "packages/contracts/types.ts",
      "apps/api/routes/users.ts",
      "apps/web/features/auth/roles.ts",
      "database/migrations/add-supervisor-role.sql",
    ],
    risks: ["Permisos incorrectos", "Migración de DB necesaria"],
    estimatedMinutes: 35,
    requiresApproval: true,
  },
  visual_identity: {
    changeType: "BRANDING",
    description: "Cambio de identidad visual / design tokens",
    directAffected: ["BRAND", "WEBSITE", "WEB_APP", "MOBILE", "INVESTOR", "GTM"],
    files: [
      "packages/ui/tokens/",
      "apps/website/styles/",
      "apps/web/styles/",
      "apps/mobile/theme/",
      "investor/deck/slides/brand.png",
    ],
    risks: ["Design system desincronizado", "Previews desactualizados"],
    estimatedMinutes: 45,
    requiresApproval: true,
  },
  deploy_provider: {
    changeType: "DEPLOYMENT",
    description: "Cambio de proveedor de deploy",
    directAffected: ["DEPLOYMENT"],
    files: [
      "deployment/vercel.json",
      "deployment/railway.toml",
      ".github/workflows/deploy.yml",
    ],
    risks: ["Downtime en preview", "Variables de entorno diferentes"],
    estimatedMinutes: 15,
    requiresApproval: true,
  },
};

export function analyzeImpact(scenario: ChangeScenario): OutputImpactResult {
  const config = SCENARIO_MAP[scenario];
  const affected = new Set<MultiOutputKind>(config.directAffected);

  // Add transitive dependents for non-removal scenarios
  if (scenario !== "remove_mobile") {
    for (const kind of config.directAffected) {
      for (const dep of getTransitiveDependents(kind)) {
        affected.add(dep);
      }
    }
  }

  const affectedOutputs = Array.from(affected);
  const unaffectedOutputs = ALL_OUTPUT_KINDS.filter((k) => !affected.has(k));

  return {
    changeType: config.changeType,
    changeDescription: config.description,
    affectedOutputs,
    affectedFiles: config.files,
    risks: config.risks,
    estimatedMinutes: config.estimatedMinutes,
    requiresApproval: config.requiresApproval,
    unaffectedOutputs,
  };
}

export function analyzeCustomImpact(
  changeType: string,
  description: string,
  directAffected: MultiOutputKind[]
): OutputImpactResult {
  const affected = new Set<MultiOutputKind>(directAffected);
  for (const kind of directAffected) {
    for (const dep of getTransitiveDependents(kind)) {
      affected.add(dep);
    }
  }

  const affectedOutputs = Array.from(affected);
  return {
    changeType,
    changeDescription: description,
    affectedOutputs,
    affectedFiles: directAffected.map((k) => `outputs/${k.toLowerCase()}/`),
    risks: ["Verificar dependencias antes de aplicar"],
    estimatedMinutes: affectedOutputs.length * 10,
    requiresApproval: affectedOutputs.length > 2,
    unaffectedOutputs: ALL_OUTPUT_KINDS.filter((k) => !affected.has(k)),
  };
}

export function formatImpactSummary(impact: OutputImpactResult): string {
  const lines = [
    `**${impact.changeDescription}**`,
    `Afectados (${impact.affectedOutputs.length}): ${impact.affectedOutputs.join(", ")}`,
    `Sin cambios (${impact.unaffectedOutputs.length}): ${impact.unaffectedOutputs.slice(0, 5).join(", ")}${impact.unaffectedOutputs.length > 5 ? "…" : ""}`,
    `Tiempo estimado: ~${impact.estimatedMinutes} min`,
    impact.requiresApproval ? "⚠️ Requiere aprobación" : "✓ Sin aprobación necesaria",
  ];
  return lines.join("\n");
}

export const DOCUMENTED_SCENARIOS: ChangeScenario[] = [
  "pricing",
  "target_customer",
  "remove_mobile",
  "add_supervisor_role",
  "visual_identity",
  "deploy_provider",
];
