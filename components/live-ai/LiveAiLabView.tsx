"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runLiveAiLab, type LiveAiLabSnapshot } from "@/lib/lab/live-ai-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { LiveOperationsCenter } from "./LiveOperationsCenter";

export function LiveAiLabView() {
  const [lab, setLab] = useState<LiveAiLabSnapshot | null>(null);

  useEffect(() => {
    setLab(runLiveAiLab());
  }, []);

  return (
    <Container className="fhis-live-ai-lab">
      <Stack gap="lg">
        <SectionHeader
          title="Live AI — Lab Harness"
          subtitle="RC6 — ingeniería y validación del centro de operaciones"
        />

        {lab && (
          <Panel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <KpiBlock label="Paneles" value={String(lab.panelCount)} />
              <KpiBlock label="Etapas" value={String(lab.stageCount)} />
              <KpiBlock label="Runtime" value={lab.runtime.source} />
              <KpiBlock label="Modo" value="dry-run" />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {lab.sampleCommands.map((cmd) => (
                <Badge key={cmd} variant="default">{cmd}</Badge>
              ))}
            </div>
            <Link href="/live" className="fhis-btn fhis-btn-primary fhis-btn-sm">
              Abrir /live →
            </Link>
          </Panel>
        )}

        <LiveOperationsCenter />
      </Stack>
    </Container>
  );
}
