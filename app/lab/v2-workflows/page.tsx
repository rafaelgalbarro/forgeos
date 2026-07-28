import { getCompositionRoot } from "@/src/core/composition";

export const dynamic = "force-dynamic";

/** PROGRAM 6085 — workflow instances from file-backed store. */
export default function V2WorkflowsLabPage() {
  const root = getCompositionRoot();
  const plans = Object.fromEntries(root.store.workflowPlans.entries());
  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>V2 Workflows Lab</h1>
      <p>Persisted workflow plans (canonical SoT under .forgeos/v2-store).</p>
      <pre>{JSON.stringify(plans, null, 2)}</pre>
    </main>
  );
}
