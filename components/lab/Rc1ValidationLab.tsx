"use client";

import { useMemo } from "react";
import Link from "next/link";
import { runRc1ValidationLab } from "@/lib/lab/rc1-validation-lab";
import { validateRc1FounderExperience } from "@/lib/lab/rc1-validation-lab";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Rc1NavLinks } from "@/components/rc1/Rc1NavLinks";

export function Rc1ValidationLab() {
  const result = useMemo(() => runRc1ValidationLab(), []);
  const founderExp = useMemo(() => validateRc1FounderExperience(), []);

  return (
    <Container className="fhis-rc1-lab">
      <SectionHeader
        title="RC1 Validation Lab"
        subtitle="E2E checklist — VANDL venture pipeline"
      />
      <Stack gap="lg">
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <Status
              status={result.passed ? "success" : "warning"}
              label={result.passed ? "ALL PASSED" : "PARTIAL"}
            />
            <Badge variant="accent">
              {result.passedCount}/{result.totalCount}
            </Badge>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{result.ventureName} ({result.ventureId})</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <KpiBlock label="Journey %" value={`${founderExp.journeyProgress}%`} />
            <KpiBlock label="Timeline events" value={String(founderExp.workspaceTimelineEvents)} />
            <KpiBlock label="Knowledge" value={founderExp.knowledgeLinked ? "Linked" : "—"} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Pipeline Steps" subtitle="Idea → Deploy Spec" />
          <div style={{ display: "grid", gap: 8 }}>
            {result.steps.map((step) => (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--fhis-color-border)",
                }}
              >
                <Status status={step.passed ? "success" : "warning"} label="" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>{step.label}</strong>
                    {step.href && (
                      <Link href={step.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                        →
                      </Link>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>{step.output}</p>
                  {step.detail && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, opacity: 0.6 }}>{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <Link href="/creator" className="fhis-btn fhis-btn-secondary fhis-btn-sm">
            Creator Flow
          </Link>
          <Link href={`/venture/${VANDL_VENTURE_ID}`} className="fhis-btn fhis-btn-ghost fhis-btn-sm" style={{ marginLeft: 8 }}>
            VANDL Workspace
          </Link>
        </Panel>

        <Rc1NavLinks />
      </Stack>
    </Container>
  );
}
