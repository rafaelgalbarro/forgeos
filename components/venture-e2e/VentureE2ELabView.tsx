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
import { runAureaFacilitiesLabHarness } from "@/lib/lab/aurea-facilities-lab";
import type { AureaFacilitiesLabSnapshot } from "@/lib/lab/aurea-facilities-lab";
import { formatE2EFinalInforme } from "@/lib/venture-e2e";
import { ensureAureaSeeded } from "@/lib/store/aurea-seed";
import { AUREA_FACILITIES_ALIAS } from "@/lib/fixtures/aurea-facilities-venture";

interface Props {
  ventureSlug?: string;
  productionHref?: string;
}

export function VentureE2ELabView({
  ventureSlug = AUREA_FACILITIES_ALIAS,
  productionHref = `/ventures/${AUREA_FACILITIES_ALIAS}`,
}: Props) {
  const [snapshot, setSnapshot] = useState<AureaFacilitiesLabSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    ensureAureaSeeded();
    const result = await runAureaFacilitiesLabHarness(ventureSlug);
    setSnapshot(result);
    setLoading(false);
  }, [ventureSlug]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <Container className="fhis-fz-lab">
      <Stack gap="lg">
        <SectionHeader
          title="AUREA FACILITIES Lab"
          subtitle="Program 10000 — harness E2E genérico contra fixture AUREA"
        />
        <Notification
          variant="info"
          title="Lab harness"
          body="Ejecuta runVentureE2EEngine() contra el fixture AUREA FACILITIES sin lógica AUREA en el motor."
        />
        <div className="fhis-fz-badges">
          <Badge variant="accent">Program 10000</Badge>
          <Link href={productionHref}>Dashboard producción →</Link>
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
                  slug: snapshot.ventureSlug,
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
            <pre className="fhis-fz-pre">{formatE2EFinalInforme(snapshot)}</pre>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
