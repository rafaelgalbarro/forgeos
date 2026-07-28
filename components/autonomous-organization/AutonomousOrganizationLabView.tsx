"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTemplate } from "@/components/ui/fhis/PageTemplate";
import { Card } from "@/components/ui/fhis/Card";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Container } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { runAutonomousOrganizationLab, type AutonomousOrganizationLabResult } from "@/lib/lab/autonomous-organization-lab";

export function AutonomousOrganizationLabView() {
  const [result, setResult] = useState<AutonomousOrganizationLabResult | null>(null);

  useEffect(() => {
    runAutonomousOrganizationLab().then(setResult);
  }, []);

  if (!result) {
    return <p>Cargando lab RC6.5…</p>;
  }

  return (
    <PageTemplate
      title="Autonomous Organization — Lab"
      subtitle="RC6.5 harness — engine, delegación, health, briefing"
    >
      <Container>
        <p>
          <Link href="/organization">← Organización principal</Link>
        </p>

        <div className="fhis-org-kpi-grid">
          <KpiBlock label="Health Score" value={`${result.healthScore}/100`} />
          <KpiBlock label="Departamentos" value={result.departmentCount} />
          <KpiBlock label="Delegaciones auto" value={result.delegationCount} />
          <KpiBlock label="Riesgos" value={result.riskCount} />
        </div>

        <SectionHeader title="Snapshot engine" />
        <Card>
          <Badge>dry-run</Badge>
          <pre className="fhis-lab-pre">{JSON.stringify(result.summary, null, 2)}</pre>
        </Card>

        <SectionHeader title="Módulos verificados" />
        <ul className="fhis-org-list">
          {result.modulesChecked.map((m) => (
            <li key={m}>✓ {m}</li>
          ))}
        </ul>

        {result.error && <p className="fhis-org-error">Error: {result.error}</p>}
      </Container>
    </PageTemplate>
  );
}
