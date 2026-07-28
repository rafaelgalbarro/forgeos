import { getCompositionRoot } from "@/src/core/composition";
import { readV2FeatureFlags } from "@/src/core/migration/feature-flags";

export const dynamic = "force-dynamic";

/** PROGRAM 6085 — V2 architecture lab (read-only diagnostics; not a product redesign). */
export default function V2ArchitectureLabPage() {
  const root = getCompositionRoot();
  const flags = readV2FeatureFlags();
  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>V2 Architecture Lab</h1>
      <p>Composition root diagnostics. Flags default OFF.</p>
      <pre>{JSON.stringify({ flags, serviceMap: root.serviceMap, missionCount: root.store.missions.size }, null, 2)}</pre>
    </main>
  );
}
