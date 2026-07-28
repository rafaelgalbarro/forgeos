"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Notification } from "@/components/ui/fhis/Notification";
import { runNetworkLab } from "@/lib/lab/network-lab";
import { DEMO_DISCLAIMER } from "@/lib/network";
import { NetworkDashboardView } from "./NetworkDashboardView";

export function NetworkLabView() {
  const lab = useMemo(() => runNetworkLab(), []);

  return (
    <Container className="fhis-network-lab">
      <Stack gap="lg">
        <Notification
          variant="warning"
          title={DEMO_DISCLAIMER}
          body="Harness de ingeniería RC10 — datos demo, sin red real."
        />

        <header className="fhis-network-header">
          <div className="fhis-network-badges">
            <Badge variant="accent">RC10 Lab</Badge>
            <Badge variant="default">v{lab.engineVersion}</Badge>
          </div>
          <SectionHeader
            title="ForgeOS Network — Lab"
            subtitle="Validación de engines, consentimiento, anonimización y aislamiento"
          />
          <Link href="/network" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            ← Dashboard /network
          </Link>
        </header>

        <div className="fhis-network-kpi-row">
          <KpiBlock label="Ámbitos consent." value={String(lab.consentScopes.length)} />
          <KpiBlock label="Insights" value={String(lab.snapshot.insights.length)} />
          <KpiBlock label="Señales" value={String(lab.snapshot.signals.length)} />
          <KpiBlock
            label="Anon. sample"
            value={`${lab.anonymizationSample.value}${lab.anonymizationSample.unit} (n=${lab.anonymizationSample.sampleSize})`}
          />
        </div>

        <Panel>
          <SectionHeader title="Privacy checklist" />
          <ul className="fhis-network-checklist">
            {lab.privacyChecks.map((check) => (
              <li key={check}>✓ {check}</li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Snapshot JSON (demo)" />
          <pre className="fhis-network-json">
            {JSON.stringify(
              {
                disclaimer: lab.snapshot.disclaimer,
                dryRunOnly: lab.snapshot.dryRunOnly,
                canContribute: lab.snapshot.canContribute,
                executiveSummaryEs: lab.snapshot.executiveSummaryEs,
                insightCount: lab.snapshot.insights.length,
              },
              null,
              2
            )}
          </pre>
        </Panel>

        <SectionHeader title="Vista integrada" />
        <NetworkDashboardView />
      </Stack>
    </Container>
  );
}
