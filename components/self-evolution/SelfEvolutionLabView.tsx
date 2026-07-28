"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Notification } from "@/components/ui/fhis/Notification";
import { runSelfEvolutionLabHarness } from "@/lib/lab/self-evolution-lab";
import type { SelfEvolutionLabSnapshot } from "@/lib/lab/self-evolution-lab";
import {
  GOVERNANCE_DISCLAIMER,
  DRY_RUN_DISCLAIMER,
  SELF_EVOLUTION_VERSION,
} from "@/lib/self-evolution";
import { SelfEvolutionDashboard } from "./SelfEvolutionDashboard";

export function SelfEvolutionLabView() {
  const [lab, setLab] = useState<SelfEvolutionLabSnapshot | null>(null);

  const refresh = useCallback(() => {
    setLab(runSelfEvolutionLabHarness());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!lab) return null;

  return (
    <Container className="fhis-sevo-lab">
      <Stack gap="lg">
        <Notification
          variant="warning"
          title="Lab harness — Program 2035"
          body={`${GOVERNANCE_DISCLAIMER} ${DRY_RUN_DISCLAIMER}`}
        />

        <header className="fhis-sevo-header">
          <div className="fhis-sevo-badges">
            <Badge variant="accent">Lab</Badge>
            <Badge variant="default">Self Evolution</Badge>
            <Badge variant="amber">dryRunOnly</Badge>
          </div>
          <SectionHeader
            title="Self Evolution Lab"
            subtitle="Harness de ingeniería — motores raw y snapshot completo"
          />
          <div className="fhis-sevo-lab-actions">
            <Button variant="secondary" size="sm" onClick={refresh}>
              Re-ejecutar motores
            </Button>
            <Link href="/self-evolution" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Dashboard →
            </Link>
          </div>
        </header>

        <Panel className="fhis-sevo-panel">
          <h3 className="fhis-sevo-panel-title">Motores raw</h3>
          <ul className="fhis-sevo-engine-grid">
            {Object.entries(lab.rawEngines).map(([key, val]) => (
              <li key={key}>
                <span>{key}</span>
                <strong>{val}</strong>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="fhis-sevo-panel">
          <h3 className="fhis-sevo-panel-title">Snapshot JSON (truncado)</h3>
          <pre className="fhis-sevo-json">
            {JSON.stringify(
              {
                version: SELF_EVOLUTION_VERSION,
                openProposals: lab.openProposals.length,
                healthScore: lab.report.healthScore,
                dryRunOnly: lab.dryRunOnly,
              },
              null,
              2
            )}
          </pre>
        </Panel>

        <SelfEvolutionDashboard />
      </Stack>
    </Container>
  );
}
