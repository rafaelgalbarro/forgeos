"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { WeeklyReview } from "@/lib/mission-control/digital-ceo/types";

interface Props {
  review: WeeklyReview;
}

export function WeeklyReviewCard({ review }: Props) {
  return (
    <Panel className="fhis-digital-ceo-weekly">
      <Stack gap="sm">
        <SectionHeader
          title="Revisión semanal"
          subtitle={`${review.weekStart} → ${review.weekEnd}`}
        />
        <p style={{ fontSize: "0.8125rem", margin: 0 }}>
          Progreso: <strong>+{review.progressDelta}%</strong> · {review.eventsCount} eventos
        </p>
        <section>
          <strong style={{ fontSize: "0.8125rem" }}>Victorias</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "0.8125rem" }}>
            {review.wins.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
        <section>
          <strong style={{ fontSize: "0.8125rem" }}>Bloqueos</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "0.8125rem" }}>
            {review.blockers.map((b) => (
              <li key={b} style={{ color: "var(--fhis-color-text-muted)" }}>
                {b}
              </li>
            ))}
          </ul>
        </section>
      </Stack>
    </Panel>
  );
}
