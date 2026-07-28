"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import type { FhisStatus } from "@/lib/design-system/types";
import {
  createStateMachineLab,
  getMockVentureProfile,
  listMockVentures,
  type StateMachineLabSession,
} from "@/lib/lab/state-machine-lab";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { getStateLabel } from "@/lib/runtime/state-machine/states";
import type { VentureState } from "@/lib/runtime/state-machine/types";

function stateToFhis(state: VentureState): FhisStatus {
  switch (state) {
    case "BLOCKED":
      return "error";
    case "PAUSED":
      return "warning";
    case "ARCHIVED":
    case "EXIT":
      return "idle";
    case "BUILD":
    case "LAUNCH":
    case "CAPITAL":
      return "active";
    default:
      return "pending";
  }
}

export function StateMachineLab() {
  const [ventureId, setVentureId] = useState(LAB_MOCK_VENTURE_ID);
  const [session, setSession] = useState<StateMachineLabSession>(() =>
    createStateMachineLab(LAB_MOCK_VENTURE_ID),
  );
  const [selectedTarget, setSelectedTarget] = useState<VentureState | null>(null);
  const [lastResult, setLastResult] = useState<ReturnType<StateMachineLabSession["attemptTransition"]> | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const snapshot = useMemo(() => {
    void tick;
    return session.getSnapshot();
  }, [session, tick]);

  const preview = useMemo(() => {
    if (!selectedTarget) return null;
    return session.previewTransition(selectedTarget);
  }, [session, selectedTarget, tick]);

  const history = useMemo(() => {
    void tick;
    return session.getHistory();
  }, [session, tick]);

  const events = useMemo(() => {
    void tick;
    return session.getEmittedEvents();
  }, [session, tick]);

  const candidates = useMemo(() => {
    void tick;
    return session.getCandidateTargets();
  }, [session, tick]);

  const profile = getMockVentureProfile(ventureId);

  const handleVentureChange = useCallback(
    (id: string) => {
      setVentureId(id);
      setSession(createStateMachineLab(id));
      setSelectedTarget(null);
      setLastResult(null);
      setTick((n) => n + 1);
    },
    [],
  );

  const handleTransition = useCallback(() => {
    if (!selectedTarget) return;
    const result = session.attemptTransition(selectedTarget);
    setLastResult(result);
    refresh();
  }, [session, selectedTarget, refresh]);

  const handleReset = useCallback(() => {
    session.reset();
    setSelectedTarget(null);
    setLastResult(null);
    refresh();
  }, [session, refresh]);

  return (
    <Container style={{ paddingBlock: "var(--fhis-space-6)" }}>
      <Stack gap="lg">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
            <Badge variant="accent">Epic 4.2</Badge>
            <Badge variant="default">Venture State Machine</Badge>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Venture State Machine
          </h1>
          <p style={{ opacity: 0.8, marginTop: "var(--fhis-space-2)" }}>
            Official lifecycle states, guards, history, Event Bus signals, and scheduler recommendations — no worker execution.
          </p>
        </header>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Mock venture</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)" }}>
              {listMockVentures().map((v) => (
                <Button
                  key={v.id}
                  variant={v.id === ventureId ? "primary" : "secondary"}
                  onClick={() => handleVentureChange(v.id)}
                >
                  {v.name}
                </Button>
              ))}
            </div>
            {profile && (
              <p style={{ margin: 0, opacity: 0.75, fontSize: "0.875rem" }}>
                {profile.description} · <code>{profile.id}</code>
              </p>
            )}
          </Stack>
        </Panel>

        <Grid cols={2} gap="md">
          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>Current state</p>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)" }}>
                <Status status={stateToFhis(snapshot.state)} label={getStateLabel(snapshot.state)} />
                <Badge variant="blue">{snapshot.state}</Badge>
              </div>
              {snapshot.resumeState && (
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
                  Resume target: <strong>{getStateLabel(snapshot.resumeState)}</strong>
                </p>
              )}
            </Stack>
          </Panel>

          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>Guard context</p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem", opacity: 0.85 }}>
                <li>discoveryComplete: {String(session.getContext().discoveryComplete)}</li>
                <li>researchComplete: {String(session.getContext().researchComplete)}</li>
                <li>hasProductPrd: {String(session.getContext().hasProductPrd)}</li>
                <li>qaComplete: {String(session.getContext().qaComplete)}</li>
                <li>hasMinimumMetrics: {String(session.getContext().hasMinimumMetrics)}</li>
                <li>blockResolved: {String(session.getContext().blockResolved)}</li>
              </ul>
            </Stack>
          </Panel>
        </Grid>

        <Panel>
          <Stack gap="sm">
            <p style={{ margin: 0, fontWeight: 600 }}>Attempt transition</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)" }}>
              {candidates.map((state) => (
                <Button
                  key={state}
                  variant={selectedTarget === state ? "primary" : "secondary"}
                  onClick={() => setSelectedTarget(state)}
                >
                  → {getStateLabel(state)}
                </Button>
              ))}
            </div>
            {preview && selectedTarget && (
              <div
                style={{
                  padding: "var(--fhis-space-3)",
                  borderRadius: "var(--fhis-radius-md, 8px)",
                  background: preview.allowed ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)", marginBottom: "var(--fhis-space-2)" }}>
                  <Status status={preview.allowed ? "success" : "error"} label={preview.allowed ? "Allowed" : "Blocked"} />
                </div>
                <p style={{ margin: 0, fontSize: "0.875rem" }}>{preview.reason}</p>
                {preview.missingRequirements.length > 0 && (
                  <p style={{ margin: "var(--fhis-space-2) 0 0", fontSize: "0.8rem", opacity: 0.85 }}>
                    Missing: {preview.missingRequirements.join(", ")}
                  </p>
                )}
                {preview.warnings.length > 0 && (
                  <p style={{ margin: "var(--fhis-space-1) 0 0", fontSize: "0.8rem", opacity: 0.75 }}>
                    Warnings: {preview.warnings.join("; ")}
                  </p>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: "var(--fhis-space-2)" }}>
              <Button onClick={handleTransition} disabled={!selectedTarget}>
                Transition
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </Stack>
        </Panel>

        {lastResult && (
          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>Last result</p>
              <Status
                status={lastResult.success ? "success" : "error"}
                label={lastResult.success ? "Success" : "Failed"}
              />
              {lastResult.suggestedTasks.length > 0 && (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>Suggested scheduler tasks</p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {lastResult.suggestedTasks.map((task) => (
                      <li key={`${task.from}-${task.taskType}`}>
                        {task.label} ({String(task.taskType)})
                        {task.note && <span style={{ opacity: 0.7 }}> — {task.note}</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {lastResult.emittedEventIds.length > 0 && (
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>
                  Emitted {lastResult.emittedEventIds.length} event(s)
                </p>
              )}
            </Stack>
          </Panel>
        )}

        <Grid cols={2} gap="md">
          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>Transition history ({history.length})</p>
              {history.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.7 }}>No transitions yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                  {[...history].reverse().map((record) => (
                    <li key={record.id} style={{ marginBottom: "var(--fhis-space-1)" }}>
                      <strong>{getStateLabel(record.from)}</strong> → <strong>{getStateLabel(record.to)}</strong>
                      <br />
                      <span style={{ opacity: 0.7 }}>{record.reason} · {record.createdAt.slice(11, 19)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Panel>

          <Panel>
            <Stack gap="sm">
              <p style={{ margin: 0, fontWeight: 600 }}>Emitted events ({events.length})</p>
              {events.length === 0 ? (
                <p style={{ margin: 0, opacity: 0.7 }}>No events yet.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.85rem" }}>
                  {[...events].reverse().map((evt) => (
                    <li key={evt.id} style={{ marginBottom: "var(--fhis-space-1)" }}>
                      <Badge variant="default">{evt.type}</Badge>
                      <span style={{ opacity: 0.7, marginLeft: "var(--fhis-space-2)" }}>
                        {evt.timestamp.slice(11, 19)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Panel>
        </Grid>
      </Stack>
    </Container>
  );
}
