"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { cn } from "@/lib/design-system/cn";
import type { PhaseState, PhaseStatus } from "./types";
import { EXECUTION_PHASES } from "./types";
import { SectionTitle } from "./shared";

interface Props {
  loading: boolean;
  hasResult: boolean;
  hasError: boolean;
}

function initialPhases(): PhaseState[] {
  return EXECUTION_PHASES.map((p) => ({ phase: p.phase, status: "pending" as PhaseStatus }));
}

function statusForPhase(
  phase: PhaseState["phase"],
  phases: PhaseState[],
  loading: boolean,
  hasResult: boolean,
  hasError: boolean
): PhaseStatus {
  const current = phases.find((p) => p.phase === phase);
  if (current) return current.status;
  if (!loading && !hasResult) return "pending";
  if (hasError && phase === "finished") return "error";
  return "pending";
}

export function ExecutionTimeline({ loading, hasResult, hasError }: Props) {
  const [phases, setPhases] = useState<PhaseState[]>(initialPhases);

  useEffect(() => {
    if (!loading && !hasResult) {
      setPhases(initialPhases());
      return;
    }

    if (!loading && hasResult) {
      setPhases(
        EXECUTION_PHASES.map((p) => ({
          phase: p.phase,
          status: hasError && p.phase === "finished" ? "error" : ("done" as PhaseStatus),
        }))
      );
      return;
    }

    if (!loading) return;

    setPhases(EXECUTION_PHASES.map((p, i) => ({
      phase: p.phase,
      status: i === 0 ? "running" : "pending",
    })));

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= EXECUTION_PHASES.length) {
        clearInterval(interval);
        return;
      }
      setPhases(
        EXECUTION_PHASES.map((p, i) => {
          if (i < step) return { phase: p.phase, status: "done" };
          if (i === step) return { phase: p.phase, status: "running" };
          return { phase: p.phase, status: "pending" };
        })
      );
    }, 700);

    return () => clearInterval(interval);
  }, [loading, hasResult, hasError]);

  const dotStatus = (status: PhaseStatus): "idle" | "active" | "success" | "error" | "pending" | "warning" => {
    switch (status) {
      case "running":
        return "active";
      case "done":
        return "success";
      case "error":
        return "error";
      default:
        return "pending";
    }
  };

  return (
    <Panel>
      <SectionTitle>Execution Timeline</SectionTitle>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--fhis-space-2)",
          alignItems: "center",
        }}
      >
        {EXECUTION_PHASES.map((step, i) => {
          const status = statusForPhase(step.phase, phases, loading, hasResult, hasError);
          return (
            <div key={step.phase} style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-2)" }}>
              <div
                className={cn("fhis-mc-exec-step")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 72,
                  padding: "var(--fhis-space-2)",
                  borderRadius: "var(--fhis-radius-sm, 4px)",
                  border: "1px solid var(--fhis-color-border, #333)",
                  opacity: status === "pending" ? 0.45 : 1,
                }}
              >
                <Status status={dotStatus(status)} label="" />
                <span style={{ fontSize: "0.75rem", marginTop: 4, fontWeight: 500 }}>{step.label}</span>
              </div>
              {i < EXECUTION_PHASES.length - 1 && (
                <span style={{ opacity: 0.3, fontSize: "0.75rem" }}>→</span>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
