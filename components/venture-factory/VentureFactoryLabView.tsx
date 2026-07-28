"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runVentureFactoryLab, type VentureFactoryLabSnapshot } from "@/lib/lab/venture-factory-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { VentureFactoryView } from "./VentureFactoryView";

export function VentureFactoryLabView() {
  const [lab, setLab] = useState<VentureFactoryLabSnapshot | null>(null);

  useEffect(() => {
    setLab(runVentureFactoryLab());
  }, []);

  return (
    <Container className="fhis-venture-factory-lab">
      <Stack gap="lg">
        <SectionHeader
          title="Venture Factory — Lab Harness"
          subtitle="RC7 — ingeniería y validación del pipeline idea→empresa"
        />

        {lab && (
          <Panel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <KpiBlock label="Etapas" value={String(lab.stageCount)} />
              <KpiBlock label="Módulos" value={String(lab.moduleCount)} />
              <KpiBlock label="Vertical demo" value={lab.demoVertical} />
              <KpiBlock label="Modo" value="dry-run" />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {lab.sampleIdeas.map((idea) => (
                <Badge key={idea} variant="default">{idea}</Badge>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/venture-factory" className="fhis-btn fhis-btn-primary fhis-btn-sm">
                Abrir /venture-factory →
              </Link>
            </div>
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Stages" subtitle="Pipeline RC7" />
          {lab && (
            <ul>
              {lab.stages.map((s) => (
                <li key={s.id}>{s.label} ({s.durationMs}ms)</li>
              ))}
            </ul>
          )}
        </Panel>

        <VentureFactoryView />
      </Stack>
    </Container>
  );
}
