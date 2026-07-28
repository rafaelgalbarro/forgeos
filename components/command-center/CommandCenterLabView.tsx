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
import { runCommandCenterLabHarness } from "@/lib/lab/command-center-lab";
import type { CommandCenterLabSnapshot } from "@/lib/lab/command-center-lab";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";

export function CommandCenterLabView() {
  const [snapshot, setSnapshot] = useState<CommandCenterLabSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    ensureVandlSeeded();
    setSnapshot(await runCommandCenterLabHarness());
    setLoading(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <Container className="fhis-cc-lab">
      <Stack gap="lg">
        <SectionHeader title="Command Center Lab" subtitle="Program 4500 harness" />
        <Badge variant="accent">Program 4500</Badge>
        <Link href="/command-center">Dashboard producción →</Link>
        <Button onClick={() => void run()} disabled={loading}>
          {loading ? "Ejecutando…" : "Re-ejecutar"}
        </Button>
        {snapshot && (
          <Panel>
            <pre className="fhis-cc-pre">
              {JSON.stringify(
                {
                  founder: snapshot.founderName,
                  ceo: snapshot.ceo.greeting,
                  ventures: snapshot.ventures.ventures.length,
                  mesh: snapshot.mesh,
                  aiMode: snapshot.ai.mode,
                  runtime: snapshot.runtime,
                  quickActions: snapshot.quickActions.length,
                },
                null,
                2
              )}
            </pre>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
