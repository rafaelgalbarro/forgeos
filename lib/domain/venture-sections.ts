import { formatProductPRDAsMarkdown, formatMvpFromPRD, formatRoadmapFromPRD } from "@/lib/ai/format-product-prd";
import {
  formatResearchCompetidores,
  formatResearchFounderInsights,
  formatResearchMercado,
} from "@/lib/ai/format-research";
import type { ProductPRD, ProductPRDResponse } from "@/lib/ai/types/product";
import type { ResearchReportResponse } from "@/lib/ai/types/research";
import type { FounderAdvisorReport } from "./founder-advisor";
import type { IdeaAnalysis } from "./idea";
import type { VentureProject, VentureSection } from "./venture";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import type { ResearchReport } from "@/lib/ai/types/research";

function section(id: VentureSection["id"], title: string, content: string, format: VentureSection["format"] = "markdown"): VentureSection {
  return { id, title, content, format };
}

export function buildVentureSections(
  venture: VentureProject,
  productPRD?: ProductPRDResponse | null,
  research?: ResearchReportResponse | null
): VentureSection[] {
  const { analysis, founderAdvisor, name, ideaText, targetAudience, intelligenceReport } = venture;
  const market = analysis?.market;
  const researchData = research?.data ?? venture.researchReport ?? null;
  const researchSource = research?.source ?? venture.researchMeta?.source ?? "mock";
  const prdContent = productPRD
    ? formatProductPRDAsMarkdown(productPRD.data, name, productPRD.source)
    : `# PRD — ${name}\n\n${ideaText}`;

  return [
    section("resumen", "Resumen Ejecutivo", buildResumen(name, ideaText, analysis, founderAdvisor, intelligenceReport, researchData)),
    section("decisiones", "Decisiones aclaradas", buildDecisiones(venture.discoveryContext)),
    section("founder-advisor", "Founder Advisor", buildFounderDoc(intelligenceReport, founderAdvisor, researchData)),
    section("mercado", "Mercado", buildMercado(market, intelligenceReport, researchData, researchSource)),
    section("competidores", "Competidores", buildCompetidores(analysis, intelligenceReport, researchData, researchSource)),
    section("prd", "PRD", prdContent),
    section("mvp", "MVP", buildMvp(name, productPRD?.data ?? null)),
    section("wireframes", "Wireframes", buildWireframes(name, productPRD?.data?.mainScreens)),
    section("ux", "UX", buildUx(name, targetAudience)),
    section("arquitectura", "Arquitectura", buildArquitectura(name)),
    section("base-datos", "Base de datos", buildDatabase(name), "code"),
    section("backend", "Backend", buildBackend(name), "code"),
    section("frontend", "Frontend", buildFrontend(name)),
    section("landing", "Landing", buildLanding(name, ideaText)),
    section("pricing", "Pricing", buildPricing(analysis)),
    section("kpis", "KPIs", buildKpis()),
    section("roadmap", "Roadmap", buildRoadmap(productPRD?.data ?? null)),
    section("legal", "Legal", buildLegal(name)),
    section("qa", "QA", buildQa(name)),
  ];
}

function buildResumen(
  name: string,
  idea: string,
  analysis: IdeaAnalysis | null,
  advisor: FounderAdvisorReport | null,
  intel: ForgeIntelligenceReport | null | undefined,
  research: ResearchReport | null
): string {
  const researchBlock = research
    ? `\n\n## Research (AI)\n${research.marketSummary.slice(0, 300)}${research.marketSummary.length > 300 ? "…" : ""}`
    : "";

  return `# ${name}

## Visión
${idea}

## Startup Score
${intel ? `**${intel.startupScore}/100** — Prioridad de lanzamiento: ${intel.launchPriority}` : ""}

## Análisis rápido
${analysis ? `- **Mercado:** ${analysis.market.mercadoEstimado}\n- **Probabilidad de éxito:** ${analysis.market.probabilidadExito}\n- **MVP:** ${analysis.market.tiempoMvp}` : ""}

## Recomendación del Founder Advisor
${intel?.founderAdvisor.recommendations.map((r) => `- ${r.text}`).join("\n") ?? advisor?.recommendation ?? "Pendiente de análisis."}${researchBlock}`;
}

function buildDecisiones(ctx: DiscoveryContext | null | undefined): string {
  if (!ctx || ctx.answers.length === 0) {
    return "# Decisiones aclaradas\n\nNo hay respuestas de discovery para este venture.";
  }

  const highlights = ctx.clarifiedDecisions.slice(0, 8);
  const answersBlock = ctx.answers
    .map((a) => {
      const label = a.answerLabel ?? (Array.isArray(a.answer) ? a.answer.join(", ") : a.answer);
      return `### ${a.question}\n**Respuesta:** ${label}\n${a.impacts.length ? `*Impacta:* ${a.impacts.join(", ")}` : ""}`;
    })
    .join("\n\n");

  return `# Decisiones aclaradas

## Resumen
- **Tipo de producto:** ${ctx.inferredProductType}
- **Modelo de negocio:** ${ctx.inferredBusinessModel}
${ctx.monetizationHints.length ? `- **Monetización:** ${ctx.monetizationHints.join(", ")}` : ""}
${ctx.platformHints.length ? `- **Plataforma:** ${ctx.platformHints.join(", ")}` : ""}

## Decisiones clave
${highlights.map((d) => `- ${d}`).join("\n")}

## Respuestas del usuario
${answersBlock}

${ctx.remainingQuestions.length ? `## Preguntas pendientes\n${ctx.remainingQuestions.map((q) => `- ${q}`).join("\n")}` : ""}`;
}

function buildFounderDoc(
  intel: ForgeIntelligenceReport | null | undefined,
  advisor: FounderAdvisorReport | null,
  research: ResearchReport | null
): string {
  if (intel) {
    const fa = intel.founderAdvisor;
    const researchBlock = research ? `\n\n${formatResearchFounderInsights(research)}` : "";
    return `# ${fa.headline}

${fa.summary}

## Riesgos detectados
${fa.risks.map((r) => `### ${r.title} (${r.severity})\n${r.description}`).join("\n\n")}

## Oportunidades
${fa.opportunities.map((o) => `### ${o.title} (${o.probability})\n${o.description}`).join("\n\n")}

## Alternativas
${fa.alternatives.map((a) => `### ${a.title}\n${a.description}\n*${a.rationale}*`).join("\n\n")}

## Recomendaciones
${fa.recommendations.map((r) => `- **${r.text}**\n  Motivo: ${r.reason}`).join("\n\n")}${researchBlock}`;
  }
  return buildFounderDocLegacy(advisor);
}

function buildFounderDocLegacy(advisor: FounderAdvisorReport | null): string {
  if (!advisor) return "# Founder Advisor\n\nEscribe más sobre tu idea para recibir análisis.";
  return `# ${advisor.headline}

${advisor.summary}

## Riesgos detectados
${advisor.risks.map((r) => `### ${r.title}\n${r.description}`).join("\n\n")}

## Oportunidades
${advisor.opportunities.map((o) => `### ${o.title} (${o.probability})\n${o.description}`).join("\n\n")}

## Alternativas recomendadas
${advisor.alternatives.map((a) => `### ${a.title}\n${a.description}\n*${a.rationale}*`).join("\n\n")}

## Recomendación
${advisor.recommendation}`;
}

function buildMercado(
  market: IdeaAnalysis["market"] | undefined,
  intel: ForgeIntelligenceReport | null | undefined,
  research: ResearchReport | null,
  researchSource: string
): string {
  if (research) {
    const base = formatResearchMercado(research, researchSource);
    if (intel) {
      return `${base}

---

## Métricas heurísticas (Forge Intelligence)
| Métrica | Valor |
|---------|-------|
| TAM estimado | ${intel.market.tamEstimate} |
| Tendencia | ${intel.market.growthTrend} |
| Competencia | ${intel.market.competitionLevel} |
| Tiempo MVP | ${intel.estimatedMvpTime} |
| Modelo de negocio | ${intel.recommendedBusinessModel} |`;
    }
    return base;
  }
  if (intel) {
    return `# Análisis de mercado

| Métrica | Valor |
|---------|-------|
| TAM estimado | ${intel.market.tamEstimate} |
| Tendencia | ${intel.market.growthTrend} |
| Competencia | ${intel.market.competitionLevel} |
| Innovación | ${intel.market.innovationLevel} |
| Probabilidad de éxito | ${intel.market.successProbability} |
| Complejidad técnica | ${intel.technicalComplexity} |
| Tiempo MVP | ${intel.estimatedMvpTime} |
| Coste desarrollo | ${intel.estimatedDevelopmentCost} |
| Modelo de negocio | ${intel.recommendedBusinessModel} |
| Escalabilidad | ${intel.market.scalability} |`;
  }
  if (!market) return "# Mercado\n\nSin datos.";
  return `# Análisis de mercado

| Métrica | Valor |
|---------|-------|
| TAM estimado | ${market.mercadoEstimado} |
| Competencia | ${market.competencia} |
| Innovación | ${market.nivelInnovacion} |
| Complejidad técnica | ${market.complejidadTecnica} |
| Probabilidad de éxito | ${market.probabilidadExito} |
| Tiempo MVP | ${market.tiempoMvp} |
| Coste desarrollo | ${market.costeDesarrollo} |
| Modelo de negocio | ${market.modeloNegocio} |
| Escalabilidad | ${market.escalabilidad} |`;
}

function buildCompetidores(
  analysis: IdeaAnalysis | null,
  intel: ForgeIntelligenceReport | null | undefined,
  research: ResearchReport | null,
  researchSource: string
): string {
  if (research) {
    const base = formatResearchCompetidores(research, researchSource);
    if (intel) {
      return `${base}

---

## Contexto heurístico
${intel.competition.landscape}

**Ventana de oportunidad:** ${intel.competition.windowOfOpportunity}`;
    }
    return base;
  }
  if (intel) {
    return `# Competidores

## Landscape
${intel.competition.landscape}

## Incumbentes
${intel.competition.incumbents.map((i) => `- ${i}`).join("\n")}

## Ventana de oportunidad
${intel.competition.windowOfOpportunity}

## Diferenciación
${intel.competition.differentiationAngle}`;
  }
  const tags = analysis?.tags.map((t) => t.label).join(", ") ?? "General";
  return `# Competidores

## Landscape
Sector detectado: **${tags}**

## Incumbentes probables
- Player global con funding Series B+
- 2-3 startups locales en fase seed
- Soluciones legacy (Excel, WhatsApp, papel)

## Ventana de oportunidad
Diferenciación por UX, nicho vertical o modelo híbrido SaaS + marketplace.`;
}

function buildMvp(name: string, prd: ProductPRD | null): string {
  if (prd) return formatMvpFromPRD(prd, name);
  return `# MVP — ${name}

## Scope (4-8 semanas)
1. Auth + onboarding
2. Core job-to-be-done funcional
3. Dashboard básico
4. Deploy staging

## Out of scope v1
- Integraciones enterprise
- App móvil nativa
- Multi-idioma`;
}

function buildWireframes(name: string, mainScreens?: string[]): string {
  if (mainScreens?.length) {
    return `# Wireframes — ${name}

\`\`\`
${mainScreens.join(" → ")}
\`\`\`

## Pantallas clave
${mainScreens.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }
  return `# Wireframes — ${name}

\`\`\`
[Landing] → [Sign up] → [Onboarding] → [Dashboard]
                              ↓
                        [Core Flow] → [Result]
\`\`\`

## Pantallas clave
1. Home / Dashboard
2. Flujo principal (3 pasos)
3. Perfil y settings`;
}

function buildUx(name: string, audience: string): string {
  return `# UX — ${name}

## Principios
- Claridad sobre densidad
- Un CTA principal por pantalla
- Feedback inmediato en cada acción

## Usuario objetivo
${audience}

## Design system
- Dark mode premium
- Tipografía Inter
- Espaciado generoso (estilo Linear/Notion)`;
}

function buildArquitectura(name: string): string {
  return `# Arquitectura — ${name}

| Capa | Stack |
|------|-------|
| Frontend | Next.js 15 + TypeScript |
| Backend | API Routes / tRPC |
| DB | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| IA | ForgeOS Workers |
| Deploy | Vercel |`;
}

function buildDatabase(name: string): string {
  return `-- ${name}
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;
}

function buildBackend(name: string): string {
  return `# API — ${name}

POST /api/auth/register
POST /api/auth/login
GET  /api/ventures
POST /api/ventures
GET  /api/ventures/:id
PATCH /api/ventures/:id`;
}

function buildFrontend(name: string): string {
  return `# Frontend — ${name}

## Estructura
- app/ — rutas
- components/ui/ — primitivos
- lib/domain/ — lógica de negocio
- lib/workers/ — orquestación IA

## Prioridad
1. Layout + auth
2. Core flow
3. Dashboard`;
}

function buildLanding(name: string, idea: string): string {
  return `# Landing — ${name}

**Headline:** ${name}
**Sub:** ${idea.slice(0, 100)}...

## Secciones
Hero → Problema → Solución → Features → Pricing → FAQ → CTA`;
}

function buildPricing(analysis: IdeaAnalysis | null): string {
  const model = analysis?.market.modeloNegocio ?? "Suscripción";
  return `# Pricing

## Modelo detectado
${model}

## Planes sugeridos
| Plan | Precio | Incluye |
|------|--------|---------|
| Free | €0 | Core limitado |
| Pro | €29/mes | Todo el producto |
| Team | €79/mes | Colaboración + admin |`;
}

function buildKpis(): string {
  return `# KPIs

## North Star
Activación en D7

## Métricas clave
- Registros / semana
- Activación D7 > 35%
- Retención M1 > 40%
- MRR
- CAC / LTV`;
}

function buildRoadmap(prd: ProductPRD | null): string {
  if (prd) return formatRoadmapFromPRD(prd);
  return `# Roadmap

## 30 días
- MVP funcional
- 10 usuarios beta

## 60 días
- Iteración UX
- Pricing activo

## 90 días
- Launch público
- Primeros €1K MRR`;
}

function buildLegal(name: string): string {
  return `# Legal — ${name}

## RGPD
- Política de privacidad
- Consentimiento cookies
- DPA con proveedores

## Términos
- ToS para usuarios
- SLA (plan Team)`;
}

function buildQa(name: string): string {
  return `# QA — ${name}

## Smoke tests
- [ ] Registro y login
- [ ] Flujo core end-to-end
- [ ] Responsive mobile

## E2E críticos
- Onboarding completo
- Pago (cuando aplique)`;
}
