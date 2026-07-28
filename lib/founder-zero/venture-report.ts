/** Program 4000 — Auto-generated validation reports. */

import type {
  CeoValidationBrief,
  FounderZeroSnapshot,
  ReadinessLevels,
  ValidationReports,
  ValidationStage,
  VentureScoreBreakdown,
} from "./types";

export function generateValidationReports(
  ventureName: string,
  stages: ValidationStage[],
  scores: VentureScoreBreakdown,
  readiness: ReadinessLevels,
  ceo: CeoValidationBrief,
  reusedModules: FounderZeroSnapshot["reusedModules"]
): ValidationReports {
  const completed = stages.filter((s) => s.status === "completed");
  const blocked = stages.filter((s) => s.status === "blocked");
  const pending = stages.filter((s) => s.status !== "completed");

  const stageTable = stages
    .map((s) => `| ${s.order} | ${s.label} | ${s.status} | ${s.moduleUsed} |`)
    .join("\n");

  const executive = `# Executive Report — ${ventureName}

**Program 4000 — First Venture Validation**

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

  const technical = `# Technical Report — ${ventureName}

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
${pending.filter((s) => ["architecture", "frontend-plan", "backend-plan", "database-plan", "build-context", "build-dna", "deployment-preview"].includes(s.id)).map((s) => `- ${s.label}`).join("\n") || "- Ninguno"}
`;

  const business = `# Business Report — ${ventureName}

## Scores
| Dimensión | Score |
|-----------|-------|
| Market | ${scores.marketScore} |
| Business | ${scores.businessScore} |
| Product | ${scores.productScore} |
| Growth | ${scores.growthScore} |
| Financial | ${scores.financialScore} |
| Risk | ${scores.riskScore} |

## Readiness
- Prototype: ${readiness.prototypeReady ? "✓" : "○"} (${readiness.prototypeScore}%)
- MVP: ${readiness.mvpReady ? "✓" : "○"} (${readiness.mvpScore}%)
- Beta: ${readiness.betaReady ? "✓" : "○"} (${readiness.betaScore}%)
- Launch: ${readiness.launchReady ? "✓" : "○"} (${readiness.launchScore}%)
`;

  const investment = `# Investment Report — ${ventureName}

## Investor Readiness: ${readiness.investorScore}%
## Overall Venture Score: ${scores.overallVentureScore}/100

## Financial Score: ${scores.financialScore}/100
## Risk Score: ${scores.riskScore}/100

## Recomendación CEO
${ceo.recommendations.slice(0, 3).map((r) => `- ${r}`).join("\n")}
`;

  const launch = `# Launch Report — ${ventureName}

## Launch Ready: ${readiness.launchReady ? "SÍ" : "NO"} (${readiness.launchScore}%)

## Checklist GTM
${stages.filter((s) => ["landing", "go-to-market", "launch-checklist", "pricing"].includes(s.id)).map((s) => `- [${s.status === "completed" ? "x" : " "}] ${s.label}`).join("\n")}

## Módulos reutilizados
${reusedModules.map((m) => `- **${m.label}** (\`${m.path}\`) — ${m.role}`).join("\n")}
`;

  return { executive, technical, business, investment, launch };
}

export function formatFinalInforme(snapshot: FounderZeroSnapshot): string {
  const blocked = snapshot.stages.filter((s) => s.status === "blocked");
  const completed = snapshot.stages.filter((s) => s.status === "completed");

  return `## PROGRAM 4000 — INFORME FINAL

### Módulos reutilizados
${snapshot.reusedModules.map((m) => `- ${m.label}: \`${m.path}\``).join("\n")}

### Módulos nuevos
- \`lib/founder-zero/\` — Venture Validation Pipeline orchestrator
- \`components/founder-zero/\` — Dashboard FHIS
- \`/founder-zero\`, \`/lab/founder-zero\`

### Venture Score: **${snapshot.scores.overallVentureScore}/100**
- Market: ${snapshot.scores.marketScore} | Business: ${snapshot.scores.businessScore} | Execution: ${snapshot.scores.executionScore}
- Product: ${snapshot.scores.productScore} | Financial: ${snapshot.scores.financialScore} | Growth: ${snapshot.scores.growthScore} | Risk: ${snapshot.scores.riskScore}

### Readiness
- Prototype: ${snapshot.readiness.prototypeReady} | MVP: ${snapshot.readiness.mvpReady} | Beta: ${snapshot.readiness.betaReady}
- Investor: ${snapshot.readiness.investorReady} | Launch: ${snapshot.readiness.launchReady}

### Riesgos
${snapshot.ceo.currentRisks.map((r) => `- ${r}`).join("\n") || "- Sin riesgos críticos"}

### Bloqueados (${blocked.length})
${blocked.map((s) => `- ${s.label}`).join("\n") || "- Ninguno"}

### Completados (${completed.length}/${snapshot.stages.length})
${completed.map((s) => `- ${s.label}`).join("\n")}

### Executive Summary
${snapshot.ceo.executiveSummary}

### Build: exit 0 | Dev: http://localhost:3000
### Rutas: /, /os, /live, /dashboard, /founder-zero, /lab/founder-zero
`;
}
