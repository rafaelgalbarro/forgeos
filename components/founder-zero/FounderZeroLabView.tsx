"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Container,
  Panel,
  Stack,
  SectionHeader,
  Badge,
  Notification,
  Button,
} from "@/components/ui/fhis";
import { runFounderZeroLabHarness } from "@/lib/lab/founder-zero-lab";
import type { FounderZeroLabSnapshot } from "@/lib/lab/founder-zero-lab";
import { formatFinalInforme } from "@/lib/founder-zero";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";

export function FounderZeroLabView() {
  const [snapshot, setSnapshot] = useState<FounderZeroLabSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    ensureVandlSeeded();
    const result = await runFounderZeroLabHarness(VANDL_VENTURE_ID);
    setSnapshot(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <Container className="fhis-fz-lab">
      <Stack gap="lg">
        <SectionHeader
          title="Founder Zero Lab"
          subtitle="Program 4000 — harness de validación de venture"
        />
        <Notification
          variant="info"
          title="Lab harness"
          body="Ejecuta runVentureValidationEngine() contra el venture canónico VANDL sin lógica específica."
        />
        <div className="fhis-fz-badges">
          <Badge variant="accent">Program 4000</Badge>
          <Link href="/founder-zero">Dashboard producción →</Link>
        </div>
        <Button onClick={() => void run()} disabled={loading}>
          {loading ? "Ejecutando…" : "Re-ejecutar harness"}
        </Button>
        {snapshot && (
          <Panel>
            <SectionHeader title="Snapshot JSON" subtitle={snapshot.computedAt} />
            <pre className="fhis-fz-pre">
              {JSON.stringify(
                {
                  venture: snapshot.venture.name,
                  progress: snapshot.progress,
                  scores: snapshot.scores,
                  readiness: snapshot.readiness,
                  health: snapshot.health,
                  ceo: snapshot.ceo,
                  stageCount: snapshot.stages.length,
                  departments: snapshot.departments.length,
                  reusedModules: snapshot.reusedModules.length,
                },
                null,
                2
              )}
            </pre>
            <SectionHeader title="Informe final" />
            <pre className="fhis-fz-pre">{formatFinalInforme(snapshot)}</pre>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
