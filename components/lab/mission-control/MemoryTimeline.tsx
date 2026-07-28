"use client";

import { Panel } from "@/components/ui/fhis/Layout";
import { Timeline } from "@/components/ui/fhis/Timeline";
import type { ExecutiveRuntimeLabMemorySnapshot } from "@/lib/lab/executive-runtime-lab";
import { SectionTitle, TechnicalToggle } from "./shared";

interface Props {
  memoryWrites: ExecutiveRuntimeLabMemorySnapshot;
}

export function MemoryTimeline({ memoryWrites }: Props) {
  const items: { title: string; time?: string; description?: string }[] = [];

  for (const review of memoryWrites.ceoReviews) {
    items.push({
      title: "CEO Review",
      time: new Date(review.createdAt).toLocaleString(),
      description: `Task: ${review.taskId} · Venture ${review.ventureId}`,
    });
  }

  for (const board of memoryWrites.boardReviews) {
    items.push({
      title: "Board Consensus",
      time: new Date(board.createdAt).toLocaleString(),
      description: `Session ${board.sessionId} · ${board.opinions.length} opiniones`,
    });
  }

  for (const consensus of memoryWrites.consensusHistory) {
    items.push({
      title: "Nueva decisión — Consenso",
      time: new Date(consensus.createdAt).toLocaleString(),
      description: `${consensus.level}: ${consensus.finalDecision}`,
    });
  }

  for (const decision of memoryWrites.executiveDecisions) {
    items.push({
      title: "Executive Decision",
      time: new Date(decision.createdAt).toLocaleString(),
      description: `${decision.title}: ${decision.decision}`,
    });
  }

  items.sort((a, b) => {
    const ta = a.time ? new Date(a.time).getTime() : 0;
    const tb = b.time ? new Date(b.time).getTime() : 0;
    return tb - ta;
  });

  return (
    <Panel>
      <SectionTitle>Memory Timeline</SectionTitle>
      {items.length > 0 ? (
        <>
          <Timeline items={items} />
          <TechnicalToggle label="Ver detalles técnicos" data={memoryWrites} />
        </>
      ) : (
        <p style={{ opacity: 0.7, margin: 0 }}>Sin escrituras en memoria — ejecuta el runtime.</p>
      )}
    </Panel>
  );
}
