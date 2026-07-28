"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Progress } from "@/components/ui/fhis/Progress";
import type { Mission } from "@/lib/mission-control/types";
import { phaseLabelEs } from "@/lib/mission-control/mission-flow";

interface Props {
  mission: Mission;
}

export function MissionStatusPanel({ mission }: Props) {
  const { status } = mission;
  const council = status.executiveCouncil;

  return (
    <Panel className="fhis-mc-status-panel">
      <Stack gap="md">
        <SectionHeader title="Estado de Misión" subtitle={mission.title} />
        <Badge variant="accent">{phaseLabelEs(mission.phase)}</Badge>

        <KpiBlock label="CEO Confidence" value={`${status.confidence}%`} />
        <Progress value={status.confidence} max={100} />

        <div>
          <strong style={{ fontSize: "0.85rem" }}>Estado CEO</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "var(--fhis-color-text-muted)" }}>
            {status.ceoStatus}
          </p>
        </div>

        {status.nextDecision && (
          <div>
            <strong style={{ fontSize: "0.85rem" }}>Próxima decisión</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.875rem" }}>{status.nextDecision}</p>
          </div>
        )}

        {status.activeDepartments.length > 0 && (
          <div>
            <strong style={{ fontSize: "0.85rem" }}>Departamentos activos</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {status.activeDepartments.map((d) => (
                <Badge key={d} variant="default">{d}</Badge>
              ))}
            </div>
          </div>
        )}

        {council?.visible && (
          <div>
            <strong style={{ fontSize: "0.85rem" }}>Consejo Ejecutivo</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.875rem" }}>{council.summary}</p>
          </div>
        )}

        {status.risks.length > 0 && (
          <div>
            <strong style={{ fontSize: "0.85rem" }}>Riesgos</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "0.875rem" }}>
              {status.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {status.recommendations.length > 0 && (
          <div>
            <strong style={{ fontSize: "0.85rem" }}>Recomendaciones</strong>
            <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "0.875rem" }}>
              {status.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </Stack>
    </Panel>
  );
}
