"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import type { CeoOutput } from "@/lib/ai-orchestration/types";
import {
  SectionTitle,
  TechnicalToggle,
  confidenceColor,
  formatPct,
} from "./shared";

interface Props {
  ceoBrief: CeoOutput | null;
}

export function ExecutiveBrief({ ceoBrief }: Props) {
  if (!ceoBrief) {
    return (
      <Panel>
        <SectionTitle>Executive Brief</SectionTitle>
        <p style={{ opacity: 0.7, margin: 0 }}>Sin brief CEO — ejecuta el runtime o revisa fallback.</p>
      </Panel>
    );
  }

  const summary = ceoBrief.executiveSummary ?? ceoBrief.summary;
  const risks = ceoBrief.criticalRisks ?? ceoBrief.risks ?? [];
  const opportunities = ceoBrief.growthOpportunities ?? [];
  const actions = ceoBrief.recommendedNextActions ?? [ceoBrief.recommendation];
  const confidence = ceoBrief.confidence;

  return (
    <Panel>
      <SectionTitle>Executive Brief</SectionTitle>
      <Stack gap="md">
        <div>
          <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6, margin: "0 0 4px" }}>
            Executive Summary
          </h3>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{summary}</p>
        </div>

        {risks.length > 0 && (
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6, margin: "0 0 4px" }}>
              Critical Risks
            </h3>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
              {risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {opportunities.length > 0 && (
          <div>
            <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6, margin: "0 0 4px" }}>
              Growth Opportunities
            </h3>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
              {opportunities.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.6, margin: "0 0 4px" }}>
            Recommended Action
          </h3>
          <p style={{ margin: 0 }}>{actions[0] ?? ceoBrief.recommendation}</p>
        </div>

        <div style={{ display: "flex", gap: "var(--fhis-space-4)", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Expected Impact</span>
            <p style={{ margin: "2px 0 0", fontWeight: 500 }}>{ceoBrief.expectedImpact || "—"}</p>
          </div>
          {confidence != null && (
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Confidence</span>
              <p style={{ margin: "2px 0 0", fontWeight: 500, color: confidenceColor(confidence) }}>
                {formatPct(confidence)}
              </p>
            </div>
          )}
          {ceoBrief.timeHorizon && (
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Time Horizon</span>
              <p style={{ margin: "2px 0 0", fontWeight: 500 }}>{ceoBrief.timeHorizon}</p>
            </div>
          )}
          {ceoBrief.priority && (
            <div>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Priority</span>
              <p style={{ margin: "2px 0 0" }}>
                <Badge variant="blue">{ceoBrief.priority}</Badge>
              </p>
            </div>
          )}
        </div>

        <TechnicalToggle label="Ver respuesta técnica" data={ceoBrief} />
      </Stack>
    </Panel>
  );
}
