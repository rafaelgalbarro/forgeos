import { getCompositionRoot } from "@/src/core/composition";

export const dynamic = "force-dynamic";

/** PROGRAM 6085 — lineage / graph read model. */
export default function V2GraphLabPage() {
  const root = getCompositionRoot();
  const lineage = Object.fromEntries(root.store.lineage.entries());
  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>V2 Graph Lab</h1>
      <p>Persisted version lineage per mission.</p>
      <pre>{JSON.stringify(lineage, null, 2)}</pre>
    </main>
  );
}
