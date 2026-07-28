"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, Grid, Stack } from "@/components/ui/fhis/Layout";
import { PageTemplate } from "@/components/ui/fhis/PageTemplate";
import { Badge } from "@/components/ui/fhis/Badge";
import { Select } from "@/components/ui/fhis/Select";
import {
  advanceCreatorStep,
  computeCreatorFlow,
  resolveCreatorVenture,
  selectCreatorStep,
  setCreatorVenture,
  type CreatorStepId,
} from "@/lib/creator-flow";
import { getVentures } from "@/lib/store/ventures";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { cn } from "@/lib/design-system/cn";
import { CreatorProgressBar } from "./CreatorProgressBar";
import { CreatorStepper } from "./CreatorStepper";
import { CreatorStepPanel } from "./CreatorStepPanel";

interface CreatorFlowViewProps {
  ventureId?: string | null;
}

export function CreatorFlowView({ ventureId }: CreatorFlowViewProps) {
  const venture = useMemo(() => resolveCreatorVenture(ventureId), [ventureId]);
  const [selectedStepId, setSelectedStepId] = useState<CreatorStepId>("idea");
  const [advancing, setAdvancing] = useState(false);
  const [advanceMessage, setAdvanceMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState(() => computeCreatorFlow(venture));

  useEffect(() => {
    ensureVandlSeeded();
  }, []);

  useEffect(() => {
    setCreatorVenture(venture.id);
    const next = computeCreatorFlow(venture);
    setSnapshot(next);
    setSelectedStepId(next.summary.currentStepId);
  }, [venture]);

  const ventures = useMemo(() => getVentures(), []);

  const handleSelectStep = useCallback(
    (id: CreatorStepId) => {
      setSelectedStepId(id);
      setSnapshot(selectCreatorStep(venture.id, id));
    },
    [venture.id]
  );

  const handleAdvance = useCallback(() => {
    setAdvancing(true);
    setAdvanceMessage(null);
    const result = advanceCreatorStep(venture, selectedStepId);
    setSnapshot(result.snapshot);
    setAdvanceMessage(result.message);
    if (result.success) {
      setSelectedStepId(result.snapshot.summary.currentStepId);
    }
    setAdvancing(false);
  }, [venture, selectedStepId]);

  const selectedStep =
    snapshot.steps.find((s) => s.id === selectedStepId) ?? snapshot.steps[0];

  return (
    <div className="immersive-root" style={{ minHeight: "100vh", background: "var(--fhis-color-bg)" }}>
      <header
        className="fhis-venture-topbar"
        style={{ borderBottom: "1px solid var(--fhis-color-line)" }}
      >
        <Link href="/" className="fhis-sidebar-logo">
          Forge<span>OS</span>
        </Link>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
            Creator Flow
          </span>
        </div>
        <div style={{ display: "flex", gap: "var(--fhis-space-2)", alignItems: "center" }}>
          {ventures.length > 1 ? (
            <Select
              value={venture.id}
              onChange={(e) => {
                const id = e.target.value;
                window.location.href = `/creator?ventureId=${id}`;
              }}
              style={{ minWidth: 160 }}
              options={ventures.map((v) => ({ value: v.id, label: v.name }))}
            />
          ) : null}
          <Link href="/founder" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Founder
          </Link>
          <Link href="/lab/rc1" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            RC1 Lab
          </Link>
          <Link href="/dashboard" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Dashboard
          </Link>
        </div>
      </header>

      <Container style={{ paddingTop: "var(--fhis-space-6)", paddingBottom: "var(--fhis-space-8)" }}>
        <PageTemplate
          title="Creator Flow"
          subtitle="Idea → Discovery → Research → CEO → Board → Product → Architecture → Build → Deploy → Growth"
        >
          <Stack gap="lg">
            <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
              <Badge variant="accent">Program 3 — Venture Creator</Badge>
              <Badge variant="blue">RC1</Badge>
            </div>

            <CreatorProgressBar summary={snapshot.summary} />

            {advanceMessage ? (
              <div
                className="fhis-panel"
                style={{
                  padding: "var(--fhis-space-3)",
                  fontSize: "var(--fhis-text-sm)",
                  color: "var(--fhis-color-green)",
                }}
              >
                {advanceMessage}
              </div>
            ) : null}

            <Grid cols={2} gap="lg" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
              <CreatorStepper
                steps={snapshot.steps}
                selectedStepId={selectedStep.id}
                onSelectStep={handleSelectStep}
              />
              <CreatorStepPanel
                step={selectedStep}
                snapshot={snapshot}
                onAdvance={handleAdvance}
                advancing={advancing}
              />
            </Grid>

            <div
              style={{
                display: "flex",
                gap: "var(--fhis-space-3)",
                flexWrap: "wrap",
                fontSize: "var(--fhis-text-sm)",
              }}
            >
              <Link href={`/founder-journey?ventureId=${venture.id}`}>Founder Journey →</Link>
              <Link href={`/venture/${venture.id}`}>Venture Workspace →</Link>
              <Link href="/ceo">CEO Workspace →</Link>
            </div>
          </Stack>
        </PageTemplate>
      </Container>
    </div>
  );
}
