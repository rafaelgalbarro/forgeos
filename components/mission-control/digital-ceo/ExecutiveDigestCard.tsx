"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { ExecutiveDigest } from "@/lib/mission-control/digital-ceo/types";

interface Props {
  digest: ExecutiveDigest;
}

export function ExecutiveDigestCard({ digest }: Props) {
  return (
    <Panel className="fhis-digital-ceo-digest">
      <Stack gap="sm">
        <SectionHeader title="Digest ejecutivo" subtitle={`Confianza ${digest.confidence}%`} />
        <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>{digest.headline}</p>
        <p style={{ fontSize: "0.8125rem", margin: 0, lineHeight: 1.5, color: "var(--fhis-color-text-muted)" }}>
          {digest.recommendation}
        </p>
        {digest.risks.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.8125rem" }}>
            {digest.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {digest.departments.map((d) => (
            <Badge key={d} variant="default">
              {d}
            </Badge>
          ))}
        </div>
      </Stack>
    </Panel>
  );
}
