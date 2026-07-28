"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MultiOutputSummary } from "@/lib/multi-output/types";
import { LoadingState } from "@/components/ui/LoadingState";

const MissionDeliverablesPanel = dynamic(
  () => import("./MissionDeliverablesPanel").then((m) => m.MissionDeliverablesPanel),
  { ssr: false }
);

interface Props {
  missionId: string;
  ventureSlug?: string;
  ideaText?: string;
}

export function MissionDeliverablesPanelLoader({ missionId, ventureSlug, ideaText }: Props) {
  const [summary, setSummary] = useState<MultiOutputSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadSummary = useCallback(async () => {
    const { ensureMultiOutputPlan, buildMultiOutputSummary } = await import("@/lib/multi-output");
    const plan = await ensureMultiOutputPlan(missionId, ideaText, ventureSlug);
    setSummary(buildMultiOutputSummary(plan));
  }, [missionId, ventureSlug, ideaText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSummary();
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadSummary]);

  const handleGenerateAll = useCallback(async () => {
    setGenerating(true);
    try {
      const { generateApprovedOutputs } = await import("@/lib/multi-output/output-coordinator");
      const { createMissionSession } = await import("@/lib/mission-control/mission-session");
      const session = createMissionSession(ideaText);
      session.missionId = missionId;
      session.ventureSlug = ventureSlug;
      if (ideaText) {
        session.intent = { primary: "VENTURE", confidence: 0.8, extractedIdea: ideaText };
      }
      await generateApprovedOutputs(session);
      await loadSummary();
    } finally {
      setGenerating(false);
    }
  }, [missionId, ventureSlug, ideaText, loadSummary]);

  if (loading) return <LoadingState title="Cargando entregables…" />;
  if (!summary) return null;

  return (
    <MissionDeliverablesPanel
      summary={summary}
      onGenerateAll={handleGenerateAll}
      generating={generating}
    />
  );
}
