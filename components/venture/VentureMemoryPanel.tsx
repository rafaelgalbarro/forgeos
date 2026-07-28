"use client";

import { useEffect, useMemo, useState } from "react";
import type { VentureProject } from "@/lib/domain/venture";
import { getVentures } from "@/lib/store/ventures";
import {
  syncVentureMemory,
  buildVentureTimeline,
  getDecisionsForVenture,
  getPatternsForVenture,
  getLearningForVenture,
  buildPortfolioMemory,
  getInsightsForVenture,
  generateRecommendations,
  getMetricsSummary,
} from "@/lib/intelligence-layer";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Panel } from "@/components/ui/fhis/Layout";
import { Stack } from "@/components/ui/fhis/Layout";
import { Timeline } from "@/components/ui/fhis/Timeline";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import { Card } from "@/components/ui/fhis/Card";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { cn } from "@/lib/design-system/cn";

type MemoriaTab = "timeline" | "decisiones" | "aprendizajes" | "patrones" | "insights";

const TABS: { id: MemoriaTab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "decisiones", label: "Decisiones" },
  { id: "aprendizajes", label: "Aprendizajes" },
  { id: "patrones", label: "Patrones" },
  { id: "insights", label: "Insights" },
];

interface VentureMemoryPanelProps {
  venture: VentureProject;
}

export function VentureMemoryPanel({ venture }: VentureMemoryPanelProps) {
  const [activeTab, setActiveTab] = useState<MemoriaTab>("timeline");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    syncVentureMemory(venture);
    setSynced(true);
  }, [venture]);

  const data = useMemo(() => {
    if (!synced) return null;
    const allVentures = getVentures();
    const portfolio = buildPortfolioMemory(allVentures);
    const decisions = getDecisionsForVenture(venture.id);
    const timeline = buildVentureTimeline(venture, decisions);
    const patterns = getPatternsForVenture(venture.id);
    const learning = getLearningForVenture(venture.id);
    const insights = getInsightsForVenture(venture.id, portfolio);
    const recommendations = generateRecommendations(venture, portfolio);
    const metrics = getMetricsSummary(allVentures);
    return { decisions, timeline, patterns, learning, insights, recommendations, metrics };
  }, [venture, synced]);

  if (!data) {
    return (
      <EmptyState title="Sincronizando memoria..." description="Preparando capa de inteligencia" />
    );
  }

  const { decisions, timeline, patterns, learning, insights, recommendations, metrics } = data;

  const decisionStatusLabel: Record<string, string> = {
    pending: "Pendiente",
    active: "Activa",
    completed: "Completada",
    reverted: "Revertida",
  };

  return (
    <Stack gap="lg">
      <SectionHeader
        title="Memoria del Venture"
        description="Capa de inteligencia — decisiones, patrones y aprendizajes acumulados"
      />

      <div className="fhis-grid fhis-grid-cols-4 fhis-grid-gap-md">
        <KpiBlock label="Decisiones" value={metrics.decisiones} />
        <KpiBlock label="Patrones" value={metrics.patrones} />
        <KpiBlock label="Insights" value={metrics.insights} />
        <KpiBlock label="Score prom." value={metrics.scorePromedio} />
      </div>

      <nav style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn("fhis-btn", "fhis-btn-sm", activeTab === tab.id ? "fhis-btn-primary" : "fhis-btn-ghost")}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "timeline" && (
        <Panel>
          {timeline.length > 0 ? (
            <Timeline
              items={timeline.map((n) => ({
                title: n.label,
                time: new Date(n.date).toLocaleDateString("es-ES"),
                description: `${n.impact} — ${n.responsible}`,
              }))}
            />
          ) : (
            <EmptyState title="Sin eventos" description="El timeline se construirá conforme avance el venture" />
          )}
        </Panel>
      )}

      {activeTab === "decisiones" && (
        <Stack gap="md">
          {decisions.length > 0 ? (
            decisions.map((d) => (
              <Card key={d.id} variant="ghost" padding="md">
                <Stack gap="sm">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{d.title}</strong>
                    <Status
                      status={d.status === "completed" ? "success" : d.status === "active" ? "active" : "pending"}
                      label={decisionStatusLabel[d.status] ?? d.status}
                    />
                  </div>
                  <p style={{ margin: 0, color: "var(--fhis-color-text-muted)", fontSize: "var(--fhis-text-sm)" }}>
                    {d.description}
                  </p>
                  <div style={{ display: "flex", gap: "var(--fhis-space-2)" }}>
                    <Badge variant="default">{d.takenBy}</Badge>
                    <Badge variant="accent">{d.expectedImpact}</Badge>
                  </div>
                </Stack>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin decisiones" description="Las decisiones se registran automáticamente en hitos clave" />
          )}
        </Stack>
      )}

      {activeTab === "aprendizajes" && (
        <Stack gap="md">
          {learning ? (
            <>
              {learning.lessonsLearned.length > 0 && (
                <Card padding="md">
                  <SectionHeader title="Lecciones aprendidas" />
                  <ul>
                    {learning.lessonsLearned.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </Card>
              )}
              {learning.bestPractices.length > 0 && (
                <Card padding="md">
                  <SectionHeader title="Mejores prácticas" />
                  <ul>
                    {learning.bestPractices.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </Card>
              )}
              {learning.repeatedMistakes.length > 0 && (
                <Card padding="md">
                  <SectionHeader title="Errores repetidos" />
                  <ul>
                    {learning.repeatedMistakes.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </Card>
              )}
              {recommendations.length > 0 && (
                <Card padding="md">
                  <SectionHeader title="Acciones recomendadas" />
                  <ul>
                    {recommendations.map((r) => (
                      <li key={r.id}>
                        <strong>{r.title}</strong> — {r.description}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          ) : (
            <EmptyState title="Sin aprendizajes" description="Los aprendizajes se generan al sincronizar el venture" />
          )}
        </Stack>
      )}

      {activeTab === "patrones" && (
        <Stack gap="md">
          {patterns.length > 0 ? (
            patterns.map((p) => (
              <Card key={p.id} padding="md">
                <Stack gap="sm">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{p.label}</strong>
                    <Badge variant="accent">{Math.round(p.confidence * 100)}%</Badge>
                  </div>
                  <p style={{ margin: 0, color: "var(--fhis-color-text-muted)" }}>{p.description}</p>
                </Stack>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin patrones" description="No se detectaron patrones para este venture" />
          )}
        </Stack>
      )}

      {activeTab === "insights" && (
        <Stack gap="md">
          {insights.length > 0 ? (
            insights.map((ins) => (
              <Card key={ins.id} padding="md">
                <Stack gap="sm">
                  <p style={{ margin: 0 }}>{ins.text}</p>
                  <div style={{ display: "flex", gap: "var(--fhis-space-2)" }}>
                    <Badge variant="default">{ins.category}</Badge>
                    <Badge variant="accent">{Math.round(ins.confidence * 100)}% confianza</Badge>
                  </div>
                </Stack>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin insights" description="Los insights se generan a nivel portfolio con más ventures" />
          )}
        </Stack>
      )}
    </Stack>
  );
}
