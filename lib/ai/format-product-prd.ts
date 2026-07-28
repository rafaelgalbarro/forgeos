import type { ProductPRD } from "./types/product";

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function formatProductPRDAsMarkdown(prd: ProductPRD, projectName: string, source: "ai" | "mock"): string {
  const badge = source === "ai" ? "✦ Generado con IA" : "Borrador simulado";

  return `# PRD — ${projectName}
> ${badge}

## Resumen ejecutivo
${prd.executiveSummary}

## Problema
${prd.problemStatement}

## Cliente objetivo
${prd.targetCustomer}

## Propuesta de valor
${prd.valueProposition}

## Alcance MVP
${list(prd.mvpScope)}

## Funcionalidades V2
${list(prd.v2Features)}

## User stories
${list(prd.userStories)}

## Pantallas principales
${list(prd.mainScreens)}

## Flujos core
${list(prd.coreFlows)}

## Hipótesis
${list(prd.assumptions)}

## Roadmap 30 / 60 / 90 días

### 30 días
${list(prd.roadmap30_60_90.day30)}

### 60 días
${list(prd.roadmap30_60_90.day60)}

### 90 días
${list(prd.roadmap30_60_90.day90)}

## Riesgos
${list(prd.risks)}

## Métricas de éxito
${list(prd.successMetrics)}`;
}

export function formatMvpFromPRD(prd: ProductPRD, projectName: string): string {
  return `# MVP — ${projectName}

## Scope (4-8 semanas)
${prd.mvpScope.map((item, i) => `${i + 1}. ${item}`).join("\n")}

## Flujos core
${list(prd.coreFlows)}

## Fuera de scope v1
${list(prd.v2Features.slice(0, 4))}

## Hipótesis a validar
${list(prd.assumptions)}`;
}

export function formatRoadmapFromPRD(prd: ProductPRD): string {
  return `# Roadmap

## 30 días
${list(prd.roadmap30_60_90.day30)}

## 60 días
${list(prd.roadmap30_60_90.day60)}

## 90 días
${list(prd.roadmap30_60_90.day90)}

## Métricas de éxito
${list(prd.successMetrics)}`;
}
