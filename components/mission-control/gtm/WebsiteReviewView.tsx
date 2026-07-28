"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import { Badge } from "@/components/ui/fhis/Badge";
import type { WebsiteReviewItem } from "@/lib/mission-control/go-to-market/types";
import { websiteReviewScore } from "@/lib/mission-control/go-to-market";

interface Props {
  items: WebsiteReviewItem[];
}

export function WebsiteReviewView({ items }: Props) {
  const score = websiteReviewScore(items);

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Revisión Web" subtitle={`Puntuación global: ${score}/100`} />
        <Progress value={score} max={100} />
        {items.map((item) => (
          <section key={item.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{item.criterion}</span>
              <Badge variant={item.score >= 7 ? "accent" : item.score >= 5 ? "amber" : "default"}>
                {item.score}/{item.maxScore}
              </Badge>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>{item.category}</div>
            <p style={{ fontSize: "0.8125rem", margin: "4px 0 0" }}>{item.recommendation}</p>
          </section>
        ))}
      </Stack>
    </Panel>
  );
}
