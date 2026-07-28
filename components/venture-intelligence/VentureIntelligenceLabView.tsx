"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runVentureIntelligenceLab, type VentureIntelligenceLabSnapshot } from "@/lib/lab/venture-intelligence-lab";
import { formatValuationEs, HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

export function VentureIntelligenceLabView() {
  const [lab, setLab] = useState<VentureIntelligenceLabSnapshot | null>(null);

  useEffect(() => {
    setLab(runVentureIntelligenceLab());
  }, []);

  return (
    <Container className="fhis-vi-lab">
      <Stack gap="lg">
        <SectionHeader
          title="Venture Intelligence — Lab"
          subtitle="RC8 — validación de motores heurísticos"
        />

        {lab && (
          <>
            <Panel>
              <div className="fhis-capital-kpi-grid">
                <KpiBlock label="Motores" value={String(lab.engineCount)} />
                <KpiBlock label="Modo" value="dry-run" />
                <KpiBlock
                  label="Valoración demo"
                  value={formatValuationEs(lab.demo.valuation.amountEur)}
                />
                <KpiBlock label="Venture score" value={`${lab.demo.ventureScore.score}/100`} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {lab.engines.map((e) => (
                  <Badge key={e} variant="default">{e}</Badge>
                ))}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <Link href="/capital" className="fhis-btn fhis-btn-primary fhis-btn-sm">
                  Abrir /capital →
                </Link>
                <Link href="/investors" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                  /investors
                </Link>
              </div>
            </Panel>

            <Panel>
              <SectionHeader title="Demo snapshot" subtitle={HEURISTIC_DISCLAIMER} />
              <pre className="fhis-lab-pre">{lab.demo.executiveSummaryEs}</pre>
            </Panel>
          </>
        )}
      </Stack>
    </Container>
  );
}
