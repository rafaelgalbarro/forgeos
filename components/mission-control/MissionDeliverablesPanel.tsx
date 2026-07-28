"use client";

import Link from "next/link";
import type { MultiOutputSummary, PlannedOutputSummary } from "@/lib/multi-output/types";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  summary: MultiOutputSummary;
  onGenerateAll?: () => void;
  generating?: boolean;
}

function statusVariant(status: string): "accent" | "default" | "amber" {
  if (status === "aprobado" || status === "preview" || status === "desplegado") return "accent";
  if (status === "generando" || status === "bloqueado" || status === "fallido") return "amber";
  return "default";
}

function healthDot(health: PlannedOutputSummary["health"]): string {
  if (health === "healthy") return "🟢";
  if (health === "warning") return "🟡";
  if (health === "error") return "🔴";
  return "⚪";
}

export function MissionDeliverablesPanel({ summary, onGenerateAll, generating }: Props) {
  const statusCounts = summary.outputs.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Panel className="fhis-mc-deliverables">
      <Stack gap="sm">
        <SectionHeader
          title="Entregables de la misión"
          subtitle={`v${summary.releaseVersion} · ${summary.readyCount}/${summary.totalOutputs} listos${summary.blockedCount > 0 ? ` · ${summary.blockedCount} bloqueados` : ""}`}
        />

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: "0.7rem" }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge key={status} variant={statusVariant(status)}>
              {status}: {count}
            </Badge>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {summary.outputs.map((card) => (
            <div
              key={card.kind}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid var(--fhis-color-border)",
                background: "var(--fhis-color-bg-subtle, #fafafa)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem" }}>{card.icon}</span>
                <span style={{ fontSize: "0.65rem" }}>{healthDot(card.health)}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.8rem", marginTop: 2 }}>{card.label}</div>
              <div style={{ marginTop: 4 }}>
                <Badge variant={statusVariant(card.status)}>{card.status}</Badge>
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--fhis-color-text-muted)", marginTop: 2 }}>
                v{card.version}
              </div>
              <Link
                href={card.studioHref}
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: "0.7rem",
                  padding: "3px 6px",
                  borderRadius: 4,
                  background: "var(--fhis-color-accent, #2563eb)",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Studio
              </Link>
            </div>
          ))}
        </div>

        {onGenerateAll && (
          <button
            type="button"
            onClick={onGenerateAll}
            disabled={generating}
            style={{
              marginTop: 8,
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "var(--fhis-color-accent, #2563eb)",
              color: "#fff",
              cursor: generating ? "wait" : "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? "Generando…" : "Generar todos los entregables aprobados"}
          </button>
        )}

        <Link href={`/studio/${summary.missionId}`} style={{ fontSize: "0.75rem", marginTop: 4 }}>
          Ver árbol completo en Output Studio →
        </Link>
      </Stack>
    </Panel>
  );
}
