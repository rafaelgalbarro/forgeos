import { getCompositionRoot } from "@/src/core/composition";
import { ATLAS_CLUBS_FIXTURE } from "@/src/core/composition/fixtures/atlas-clubs";

export const dynamic = "force-dynamic";

/** PROGRAM 6085 — capability registry surface (fixture listed only as example data). */
export default function V2CapabilitiesLabPage() {
  const root = getCompositionRoot();
  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>V2 Capabilities Lab</h1>
      <p>Capability executor wired via orchestration kernel + application factories.</p>
      <pre>
        {JSON.stringify(
          {
            capabilityRegistry: root.serviceMap.capabilityRegistry,
            capabilityExecutor: root.serviceMap.capabilityExecutor,
            exampleFixtureCapabilities: ATLAS_CLUBS_FIXTURE.capabilities,
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
