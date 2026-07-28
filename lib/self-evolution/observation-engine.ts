/** Program 2035 — Observation engine: monitor ForgeOS subsystems. */

import type { ObservationSignal } from "./types";

const NOW = () => new Date().toISOString();

function signal(
  partial: Omit<ObservationSignal, "id" | "detectedAt" | "heuristic" | "dryRun">
): ObservationSignal {
  return {
    ...partial,
    id: `obs-${partial.category}-${partial.title.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`,
    detectedAt: NOW(),
    heuristic: true,
    dryRun: true,
  };
}

/** Mandatory demo: slow build detection */
function detectSlowBuild(): ObservationSignal {
  return signal({
    category: "build",
    severity: "warning",
    title: "Build lento detectado",
    description:
      "El tiempo de build supera 45s (umbral: 30s). Posibles causas: bundle grande, imports no tree-shakeados, o compilación incremental desactivada.",
    source: "observation-engine/build-metrics",
    metric: "buildDurationSec",
    value: 47,
    affectedArea: "build",
  });
}

/** Mandatory demo: duplicate component */
function detectDuplicateComponent(): ObservationSignal {
  return signal({
    category: "code-quality",
    severity: "warning",
    title: "Componente duplicado detectado",
    description:
      "KpiBlock y MetricCard comparten ~78% de estructura JSX. Consolidar en un componente base reduciría mantenimiento.",
    source: "observation-engine/duplicate-scan",
    metric: "similarityPct",
    value: 78,
    affectedArea: "code-health",
  });
}

/** Mandatory demo: unused route */
function detectUnusedRoute(): ObservationSignal {
  return signal({
    category: "routes",
    severity: "info",
    title: "Ruta sin uso detectada",
    description:
      "/lab/rc1 no tiene tráfico en 30 días y no aparece en navegación activa. Candidata a archivar o documentar como legacy.",
    source: "observation-engine/route-analytics",
    metric: "hits30d",
    value: 0,
    affectedArea: "runtime",
  });
}

/** Mandatory demo: founder improvement opportunity */
function detectFounderOpportunity(): ObservationSignal {
  return signal({
    category: "ux",
    severity: "info",
    title: "Oportunidad de mejora en flujo Founder",
    description:
      "El onboarding del fundador tiene 4 pasos pero el 62% abandona en paso 2. Simplificar a 3 pasos podría mejorar conversión.",
    source: "observation-engine/founder-funnel",
    metric: "dropoffStep2Pct",
    value: 62,
    affectedArea: "founder",
  });
}

const STATIC_HEURISTICS: ObservationSignal[] = [
  detectSlowBuild(),
  detectDuplicateComponent(),
  detectUnusedRoute(),
  detectFounderOpportunity(),
  signal({
    category: "errors",
    severity: "warning",
    title: "Errores repetitivos en AI Runtime",
    description: "Timeout en provider fallback detectado 12 veces en 24h.",
    source: "observation-engine/error-aggregate",
    metric: "count24h",
    value: 12,
    affectedArea: "ai-runtime",
  }),
  signal({
    category: "performance",
    severity: "warning",
    title: "Cuello de botella en mesh",
    description: "Latencia p95 del Executive Mesh > 800ms en decisiones multi-departamento.",
    source: "observation-engine/mesh-latency",
    metric: "p95ms",
    value: 820,
    affectedArea: "mesh",
  }),
  signal({
    category: "docs",
    severity: "info",
    title: "Documentación desactualizada",
    description: "docs/venture-factory/ no actualizado desde hace 90 días.",
    source: "observation-engine/doc-staleness",
    affectedArea: "documentation",
  }),
  signal({
    category: "code-quality",
    severity: "info",
    title: "TODO/FIXME acumulados",
    description: "47 marcadores TODO/FIXME en lib/ y components/.",
    source: "observation-engine/todo-scan",
    metric: "count",
    value: 47,
    affectedArea: "code-health",
  }),
  signal({
    category: "skills",
    severity: "info",
    title: "Skill sin uso en 60 días",
    description: "marketing-copy-v2 registrada pero sin invocaciones.",
    source: "observation-engine/skills-usage",
    affectedArea: "skills",
  }),
  signal({
    category: "warnings",
    severity: "warning",
    title: "Import circular potencial",
    description: "lib/capabilities ↔ lib/skills — dependencia circular detectada por análisis estático.",
    source: "observation-engine/circular-deps",
    affectedArea: "architecture",
  }),
  signal({
    category: "ux",
    severity: "warning",
    title: "Problema de accesibilidad",
    description: "3 botones sin aria-label en dashboard de capital.",
    source: "observation-engine/a11y-scan",
    metric: "violations",
    value: 3,
    affectedArea: "ux",
  }),
  signal({
    category: "enterprise",
    severity: "info",
    title: "Lab abandonado",
    description: "/lab/os-rc2 sin actividad reciente — candidato a consolidación.",
    source: "observation-engine/lab-usage",
    affectedArea: "enterprise",
  }),
  signal({
    category: "feedback",
    severity: "info",
    title: "Feedback positivo en Marketplace",
    description: "Skill pack 'analytics-pro' con NPS 9.2 — replicar patrón.",
    source: "observation-engine/feedback",
    affectedArea: "marketplace",
  }),
];

export function runObservationEngine(): ObservationSignal[] {
  return STATIC_HEURISTICS.map((s) => ({ ...s, detectedAt: NOW() }));
}

export function getObservationsByCategory(
  observations: ObservationSignal[],
  category: ObservationSignal["category"]
): ObservationSignal[] {
  return observations.filter((o) => o.category === category);
}

export function getCriticalObservations(observations: ObservationSignal[]): ObservationSignal[] {
  return observations.filter((o) => o.severity === "critical" || o.severity === "warning");
}
