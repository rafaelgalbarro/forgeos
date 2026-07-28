"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runForgeCapitalLab, type ForgeCapitalLabSnapshot } from "@/lib/lab/forge-capital-lab";
import { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";

export function ForgeCapitalLabView() {
  const [lab, setLab] = useState<ForgeCapitalLabSnapshot | null>(null);

  useEffect(() => {
    setLab(runForgeCapitalLab());
  }, []);

  return (
    <Container className="fhis-forge-capital-lab">
      <Stack gap="lg">
        <SectionHeader
          title="Forge Capital — Lab"
          subtitle="RC8 — departamentos AI y composición de motores"
        />

        {lab && (
          <>
            <Panel>
              <div className="fhis-capital-kpi-grid">
                <KpiBlock label="Departamentos" value={String(lab.departmentCount)} />
                <KpiBlock label="Modo" value={lab.capital.mode} />
                <KpiBlock label="Dry-run" value="true" />
                <KpiBlock
                  label="Investor readiness"
                  value={`${lab.capital.intelligence.investorReadiness.score}%`}
                />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {lab.departments.map((d) => (
                  <Badge key={d} variant="default">{d}</Badge>
                ))}
              </div>
              <Link href="/capital" className="fhis-btn fhis-btn-primary fhis-btn-sm" style={{ marginTop: 16, display: "inline-block" }}>
                Abrir /capital →
              </Link>
            </Panel>

            <Panel>
              <SectionHeader title="Departamentos AI" subtitle={HEURISTIC_DISCLAIMER} />
              <div className="fhis-capital-ai-grid">
                {lab.capital.departments.map((dept) => (
                  <ExecutiveCard key={dept.departmentId} name={dept.departmentName} role={dept.mode}>
                    <p className="fhis-founder-prose">{dept.insight}</p>
                    <Badge variant="amber">{dept.disclaimer}</Badge>
                  </ExecutiveCard>
                ))}
              </div>
            </Panel>
          </>
        )}
      </Stack>
    </Container>
  );
}
