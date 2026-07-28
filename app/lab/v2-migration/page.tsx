import { readV2FeatureFlags, isLegacyOnlyMode, V2_FLAG_DEFAULTS } from "@/src/core/migration/feature-flags";

export const dynamic = "force-dynamic";

/** PROGRAM 6085 — migration flag diagnostics (defaults OFF). */
export default function V2MigrationLabPage() {
  const flags = readV2FeatureFlags();
  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>V2 Migration Lab</h1>
      <p>Strangler flags — defaults OFF; legacy remains authoritative.</p>
      <pre>
        {JSON.stringify(
          {
            defaults: V2_FLAG_DEFAULTS,
            current: flags,
            legacyOnlyMode: isLegacyOnlyMode(),
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
