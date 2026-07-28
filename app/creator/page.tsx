"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreatorFlowView } from "@/components/creator-flow/CreatorFlowView";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { FounderJourneyShell } from "@/components/founder-journey/FounderJourneyShell";
import { LegacyConsolidationBanner } from "@/components/layout/LegacyConsolidationBanner";

function CreatorPageInner() {
  const searchParams = useSearchParams();
  const ventureId = searchParams?.get("ventureId") ?? VANDL_VENTURE_ID;
  return (
    <FounderJourneyShell showBanner={false}>
      <LegacyConsolidationBanner from="/creator" />
      <CreatorFlowView ventureId={ventureId} />
    </FounderJourneyShell>
  );
}

export default function CreatorPage() {
  return (
    <Suspense
      fallback={
        <div className="fhis-page" style={{ padding: "var(--fhis-space-8)" }}>
          Cargando Creator Flow…
        </div>
      }
    >
      <CreatorPageInner />
    </Suspense>
  );
}
