/** Program 10000 — Auto-generated E2E reports. */

import type {
  E2ECeoBrief,
  E2EReadiness,
  E2EReports,
  E2EStage,
  E2EVentureScores,
  VentureE2ESnapshot,
} from "./types";

export function generateE2EReports(
  ventureName: string,
  stages: E2EStage[],
  scores: E2EVentureScores,
  readiness: E2EReadiness,
  ceo: E2ECeoBrief,
  reusedModules: VentureE2ESnapshot["reusedModules"]
): E2EReports {
  const completed = stages.filter((s) => s.status === "completed");
  const blocked = stages.filter((s) => s.status === "blocked");

  const stageTable = stages
    .map((s) => `| ${s.order} | ${s.label} | ${s.status} | ${s.moduleUsed} |`)
    .join("\n");

  const executive = `# Executive Report — ${ventureName}

**Program 10000 — Venture E2E Pipeline**

## Executive Summary
${ceo.executiveSummary}

## Overall Venture Score: ${scores.overallVentureScore}/100
## Confidence: ${ceo.confidenceScore}%

## Current Risks
${ceo.currentRisks.map((r) => `- ${r}`).join("\n") || "- Ninguno crítico"}

## Recommendations
${ceo.recommendations.map((r) => `- ${r}`).join("\n")}

## Next Actions
${ceo.nextActions.map((a) => `- ${a}`).join("\n")}

## Progress
- Completados: ${completed.length}/${stages.length}
- Bloqueados: ${blocked.length}
- Readiness: ${ceo.overallReadiness}
`;

  const businessPlan = `# Business Plan — ${ventureName}

## Scores
| Dimensión | Score |
|-----------|-------|
| Market | ${scores.marketScore} |
| Business | ${scores.businessScore} |
| Product | ${scores.productScore} |
| Growth | ${scores.growthScore} |
| Financial | ${scores.financialScore} |
| Risk | ${scores.riskScore} |

## Business Model & Pricing
${stages.filter((s) => ["business-model", "pricing", "market"].includes(s.id)).map((s) => `- **${s.label}** (${s.status}): ${s.resultSummary}`).join("\n")}

## Readiness
- Prototype: ${readiness.prototypeReady ? "✓" : "○"} (${readiness.prototypeScore}%)
- MVP: ${readiness.mvpReady ? "✓" : "○"} (${readiness.mvpScore}%)
- Beta: ${readiness.betaReady ? "✓" : "○"} (${readiness.betaScore}%)
- Launch: ${readiness.launchReady ? "✓" : "○"} (${readiness.launchScore}%)
`;

  const technicalArchitecture = `# Technical Architecture — ${ventureName}

## Pipeline técnico
| # | Etapa | Estado | Módulo |
|---|-------|--------|--------|
${stageTable}

## Build & Deploy
- Build Context / DNA integrados vía Build Platform
- Deployment Preview vía Build Pipeline (dry-run)

## Etapas bloqueadas
${blocked.map((s) => `- **${s.label}**: ${s.resultSummary}`).join("\n") || "- Ninguna"}

## Pendientes técnicos
${stages.filter((s) => ["architecture", "build-context", "build-dna", "deployment-preview"].includes(s.id) && s.status !== "completed").map((s) => `- ${s.label}`).join("\n") || "- Ninguno"}
`;

  const investorReadiness = `# Investor Readiness — ${ventureName}

## Investor Readiness: ${readiness.investorScore}%
## Overall Venture Score: ${scores.overallVentureScore}/100

## Financial Score: ${scores.financialScore}/100
## Risk Score: ${scores.riskScore}/100

## Recomendación CEO
${ceo.recommendations.slice(0, 3).map((r) => `- ${r}`).join("\n")}
`;

  const launchPlan = `# Launch Plan — ${ventureName}

## Launch Ready: ${readiness.launchReady ? "SÍ" : "NO"} (${readiness.launchScore}%)

## Checklist GTM
${stages.filter((s) => ["landing", "go-to-market", "launch-checklist", "pricing", "brand"].includes(s.id)).map((s) => `- [${s.status === "completed" ? "x" : " "}] ${s.label}`).join("\n")}

## Módulos reutilizados
${reusedModules.map((m) => `- **${m.label}** (\`${m.path}\`) — ${m.role}`).join("\n")}
`;

  return { executive, businessPlan, technicalArchitecture, investorReadiness, launchPlan };
}

export function formatE2EFinalInforme(snapshot: VentureE2ESnapshot): string {
  const blocked = snapshot.stages.filter((s) => s.status === "blocked");
  const completed = snapshot.stages.filter((s) => s.status === "completed");

  return `## PROGRAM 10000 — INFORME FINAL

### Venture: ${snapshot.venture.name} (${snapshot.ventureSlug})

### Módulos reutilizados
${snapshot.reusedModules.map((m) => `- ${m.label}: \`${m.path}\``).join("\n")}

### Venture Score: **${snapshot.scores.overallVentureScore}/100**
- Market: ${snapshot.scores.marketScore} | Business: ${snapshot.scores.businessScore} | Execution: ${snapshot.scores.executionScore}
- Product: ${snapshot.scores.productScore} | Financial: ${snapshot.scores.financialScore} | Growth: ${snapshot.scores.growthScore} | Risk: ${snapshot.scores.riskScore}

### Readiness
- Prototype: ${snapshot.readiness.prototypeReady} | MVP: ${snapshot.readiness.mvpReady} | Beta: ${snapshot.readiness.betaReady}
- Investor: ${snapshot.readiness.investorReady} (${snapshot.readiness.investorScore}%) | Launch: ${snapshot.readiness.launchReady} (${snapshot.readiness.launchScore}%)

### Riesgos
${snapshot.ceo.currentRisks.map((r) => `- ${r}`).join("\n") || "- Sin riesgos críticos"}

### Bloqueados (${blocked.length})
${blocked.map((s) => `- ${s.label}`).join("\n") || "- Ninguno"}

### Completados (${completed.length}/${snapshot.stages.length})
${completed.map((s) => `- ${s.label}`).join("\n")}
`;
}
