"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MissionOutputSummary } from "@/lib/creation-output/types";
import { LoadingState } from "@/components/ui/LoadingState";

const CreatedOutputsPanel = dynamic(
  () => import("./CreatedOutputsPanel").then((m) => m.CreatedOutputsPanel),
  { ssr: false }
);

interface Props {
  missionId: string;
  ventureSlug?: string;
  ventureId?: string;
}

export function CreatedOutputsPanelLoader({ missionId, ventureSlug, ventureId }: Props) {
  const [summary, setSummary] = useState<MissionOutputSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { ensureMissionOutputs } = await import("@/lib/creation-output/output-builder");
        const { buildMissionOutputSummary } = await import("@/lib/creation-output/output-registry");
        const { seedMemoryOutputs } = await import("@/lib/creation-output/output-repository");

        const outputs = await ensureMissionOutputs(missionId, ventureSlug);
        if (!cancelled) {
          seedMemoryOutputs(outputs);
          setSummary(buildMissionOutputSummary(missionId, ventureSlug, ventureId));
        }
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [missionId, ventureSlug, ventureId]);

  if (loading) return <LoadingState title="Cargando resultados…" />;
  if (!summary) return null;

  return <CreatedOutputsPanel summary={summary} />;
}
