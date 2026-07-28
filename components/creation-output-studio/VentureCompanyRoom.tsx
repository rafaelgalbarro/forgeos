"use client";

import Link from "next/link";
import type { VentureOutputPayload } from "@/lib/creation-output/types";
import { OUTPUT_TYPE_LABELS } from "@/lib/creation-output/types";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  payload: VentureOutputPayload;
  missionId: string;
}

export function VentureCompanyRoom({ payload, missionId }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Company Room" subtitle={payload.name} />
        <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{payload.executiveSummary}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <InfoCard label="Value Proposition" value={payload.valueProposition} />
          <InfoCard label="ICP" value={payload.icp} />
          <InfoCard label="Mercado" value={payload.market} />
          <InfoCard label="Business Model" value={payload.businessModel} />
          <InfoCard label="Pricing" value={payload.pricing} />
        </div>

        <SectionHeader title="KPIs" />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {payload.kpis.map((k) => (
            <div key={k.label} style={{ padding: 12, borderRadius: 8, border: "1px solid var(--fhis-color-border)", minWidth: 120 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>{k.label}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{k.value}</div>
              {k.trend && <Badge variant="accent">{k.trend}</Badge>}
            </div>
          ))}
        </div>

        <SectionHeader title="Readiness" />
        <div style={{ display: "flex", gap: 16 }}>
          <ReadinessBadge label="Investor" score={payload.investorReadiness.score} />
          <ReadinessBadge label="Launch" score={payload.launchReadiness.score} />
        </div>

        <SectionHeader title="Enlaces a outputs" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(payload.linkedOutputs).map(([type, outputId]) => (
            <Link
              key={type}
              href={`/studio/${missionId}?type=${type}&output=${outputId}`}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--fhis-color-border)",
                textDecoration: "none",
                fontSize: "0.8rem",
                color: "inherit",
              }}
            >
              {OUTPUT_TYPE_LABELS[type as keyof typeof OUTPUT_TYPE_LABELS] ?? type}
            </Link>
          ))}
        </div>
      </Stack>
    </Panel>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: "var(--fhis-color-bg-subtle, #fafafa)" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--fhis-color-text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "0.85rem" }}>{value.slice(0, 200)}{value.length > 200 ? "…" : ""}</div>
    </div>
  );
}

function ReadinessBadge({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{score}%</div>
    </div>
  );
}
