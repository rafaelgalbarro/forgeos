"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { FounderJourneyView } from "@/components/founder-journey/FounderJourneyView";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";

function FounderJourneyPageInner() {
  const searchParams = useSearchParams();
  const ventureId = searchParams?.get("ventureId") ?? VANDL_VENTURE_ID;

  return <FounderJourneyView ventureId={ventureId} />;
}

export default function FounderJourneyPage() {
  return (
    <Suspense
      fallback={
        <div className="fhis-page" style={{ padding: "var(--fhis-space-8)" }}>
          Cargando tu recorrido…
        </div>
      }
    >
      <FounderJourneyPageInner />
    </Suspense>
  );
}
