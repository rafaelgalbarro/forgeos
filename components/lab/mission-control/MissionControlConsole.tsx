"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import type { ExecutiveRuntimeLabResult } from "@/lib/lab/executive-runtime-lab";
import { runExecutiveRuntimeLab } from "@/lib/lab/executive-runtime-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { ConsensusPanel } from "./ConsensusPanel";
import { DecisionGraphVisualizer } from "./DecisionGraphVisualizer";
import { DeveloperConsole } from "./DeveloperConsole";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { ExecutiveBoard } from "./ExecutiveBoard";
import { ExecutiveBrief } from "./ExecutiveBrief";
import { ExecutiveRuntimeStatus } from "./ExecutiveRuntimeStatus";
import { FutureModules } from "./FutureModules";
import { MemoryTimeline } from "./MemoryTimeline";
import { ObservabilityPanel } from "./ObservabilityPanel";
import { TelemetryPanel } from "./TelemetryPanel";
import { getMissionControlLog, registerMissionControlRun } from "./observability-store";
import type { DeveloperConsoleData, ObservabilityEntry } from "./types";

export function MissionControlConsole() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecutiveRuntimeLabResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [obsLog, setObsLog] = useState<ObservabilityEntry[]>([]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const labResult = await runExecutiveRuntimeLab();
      setResult(labResult);
      registerMissionControlRun(labResult);
      setObsLog(getMissionControlLog());
      if (labResult.error) {
        setError(labResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const developerData: DeveloperConsoleData | null = result
    ? {
        ceoResponse: result.ceoBrief,
        boardResponses: result.boardOpinions,
        consensusOutput: result.consensus,
        validatorWarnings: result.warnings,
        fallbackUsed: result.fallbackUsed,
        memoryWrites: result.memoryWrites,
        decisionWrites: result.decisionGraphNodes,
      }
    : null;

  const emptyMemory = {
    ceoReviews: [],
    boardReviews: [],
    consensusHistory: [],
    executiveDecisions: [],
  };

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 3.2.2</Badge>
            <Badge variant="default">Mission Control</Badge>
          </div>
          <p style={{ opacity: 0.7, marginBottom: "var(--fhis-space-2)" }}>
            ForgeOS Engineering Console · Venture: <code>{LAB_MOCK_VENTURE_ID}</code>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            ForgeOS Mission Control
          </h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Observa, depura y valida todas las intelligences ejecutivas — CEO, Board, Consensus, Decision Graph y Memory.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <Button loading={loading} onClick={handleRun}>
              Ejecutar Executive Runtime
            </Button>
            {error && (
              <p style={{ color: "var(--fhis-color-warning, #f59e0b)", margin: 0 }}>
                {error}
              </p>
            )}
          </Stack>
        </Panel>

        <ExecutionTimeline loading={loading} hasResult={!!result} hasError={!!error} />

        {(loading || result) && (
          <Stack gap="lg">
            <ExecutiveRuntimeStatus result={result} loading={loading} error={error} />

            <Grid cols={2} gap="md">
              <ExecutiveBrief ceoBrief={result?.ceoBrief ?? null} />
              <ConsensusPanel
                consensus={result?.consensus ?? null}
                opinions={result?.boardOpinions ?? []}
              />
            </Grid>

            {result && (
              <ExecutiveBoard
                members={result.boardMembers}
                opinions={result.boardOpinions}
              />
            )}

            <Grid cols={2} gap="md">
              <DecisionGraphVisualizer nodes={result?.decisionGraphNodes ?? []} />
              <MemoryTimeline memoryWrites={result?.memoryWrites ?? emptyMemory} />
            </Grid>

            <Grid cols={2} gap="md">
              <TelemetryPanel result={result} />
              <ObservabilityPanel entries={obsLog} />
            </Grid>

            <FutureModules />
            <DeveloperConsole data={developerData} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
