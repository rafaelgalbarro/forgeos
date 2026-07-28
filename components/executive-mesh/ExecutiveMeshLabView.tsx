"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runExecutiveMeshLab, type ExecutiveMeshLabResult } from "@/lib/lab/executive-mesh-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

export function ExecutiveMeshLabView() {
  const [data, setData] = useState<ExecutiveMeshLabResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runExecutiveMeshLab().then((r) => {
      setData(r);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <Container>
        <p>Cargando Executive Mesh…</p>
      </Container>
    );
  }

  const protocol = data.protocol;

  return (
    <Container className="fhis-executive-mesh-lab">
      <SectionHeader
        title="Executive Mesh & Skills"
        subtitle="RC4 — Piensa, decide, colabora, ejecuta, aprende"
      />

      {data.error && (
        <Panel>
          <Status status="warning" label={data.error} />
        </Panel>
      )}

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {(protocol?.stages ?? []).map((s, i) => (
              <Badge key={`${s}-${i}`} variant={i === (protocol?.stages.length ?? 0) - 1 ? "accent" : "default"}>
                {i > 0 && "→ "}
                {s}
              </Badge>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <KpiBlock label="Departamentos" value={String(data.departmentCount)} />
            <KpiBlock label="Skills usadas" value={String(data.skillHistory.length)} />
            <KpiBlock label="Reuniones" value={String(data.meetings.length)} />
            <KpiBlock label="Debates" value={String(data.debates.length)} />
            <KpiBlock label="Decision Graph" value={String(data.decisionGraphNodes.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Organigrama" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {data.orgChart.map((d) => (
              <div
                key={d.id}
                style={{ padding: 10, border: "1px solid var(--fhis-color-border)", borderRadius: 8, fontSize: 12 }}
              >
                <strong>{d.label}</strong>
                {d.boardSeat && <Badge variant="accent">Board</Badge>}
              </div>
            ))}
          </div>
        </Panel>

        {protocol && (
          <Panel>
            <SectionHeader title="Capabilities ejecutadas" />
            {protocol.capabilityResults.map((c) => (
              <div key={c.requestId} style={{ fontSize: 13, marginBottom: 8 }}>
                <strong>{c.capabilityId}</strong> — {c.output.slice(0, 120)}
                <span style={{ opacity: 0.6, marginLeft: 8 }}>({c.latencyMs}ms)</span>
              </div>
            ))}
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Mesh Turns" subtitle={`${protocol?.meshTurns.length ?? 0} interacciones`} />
          <div style={{ maxHeight: 160, overflow: "auto", fontSize: 12 }}>
            {protocol?.meshTurns.slice(0, 8).map((t, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <Badge variant="default">{t.departmentId}</Badge> {t.action}: {t.message.slice(0, 80)}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <Link href="/lab/skills" className="fhis-btn fhis-btn-primary fhis-btn-sm">
            Skills Framework →
          </Link>
          <Link href="/lab/ai-collaboration" className="fhis-btn fhis-btn-ghost fhis-btn-sm" style={{ marginLeft: 8 }}>
            AI Collaboration →
          </Link>
        </Panel>
      </Stack>
    </Container>
  );
}
