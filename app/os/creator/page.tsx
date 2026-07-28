"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreatorFlowView } from "@/components/creator-flow/CreatorFlowView";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";

function OsCreatorInner() {
  const searchParams = useSearchParams();
  const ventureId = searchParams?.get("ventureId") ?? VANDL_VENTURE_ID;
  return <CreatorFlowView ventureId={ventureId} />;
}

export default function OsCreatorPage() {
  return (
    <OsModuleFrame title="Creator" description="Pipeline Idea → Growth">
      <Suspense fallback={<p>Cargando Creator…</p>}>
        <OsCreatorInner />
      </Suspense>
    </OsModuleFrame>
  );
}
