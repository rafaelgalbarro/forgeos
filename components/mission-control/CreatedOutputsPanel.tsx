"use client";

import Link from "next/link";
import type { MissionOutputSummary } from "@/lib/creation-output/types";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  summary: MissionOutputSummary;
}

function statusVariant(status: string): "accent" | "default" | "amber" {
  if (status === "APPROVED" || status === "PREVIEW_READY" || status === "EXPORT_READY" || status === "DEPLOYMENT_READY")
    return "accent";
  if (status === "GENERATING" || status === "VALIDATING" || status === "CHANGES_REQUESTED") return "amber";
  return "default";
}

export function CreatedOutputsPanel({ summary }: Props) {
  return (
    <Panel className="fhis-mc-created-outputs">
      <Stack gap="sm">
        <SectionHeader title="Resultados creados" subtitle="Abrir en Output Studio — sin previews aquí" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {summary.outputs.map((card) => (
            <div
              key={card.type}
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--fhis-color-border)",
                background: "var(--fhis-color-bg-subtle, #fafafa)",
              }}
            >
              <div style={{ fontSize: "1.2rem" }}>{card.icon}</div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{card.label}</div>
              <div style={{ marginTop: 4 }}>
                <Badge variant={statusVariant(card.status)}>{card.status}</Badge>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--fhis-color-text-muted)", marginTop: 4 }}>
                v{card.version}
              </div>
              <Link
                href={card.studioHref}
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: "0.75rem",
                  padding: "4px 8px",
                  borderRadius: 4,
                  background: "var(--fhis-color-accent, #2563eb)",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                Abrir en Studio
              </Link>
            </div>
          ))}
        </div>
        <Link href={`/studio/${summary.missionId}`} style={{ fontSize: "0.8rem", marginTop: 4 }}>
          Ver todos en Output Studio →
        </Link>
      </Stack>
    </Panel>
  );
}
