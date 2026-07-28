"use client";

/**
 * PROGRAM 6050 — Studio V2 delivery tabs (minimal extension).
 * Sections: Overview, Artifacts, Outputs, Code, Builds, Previews, Releases, Deployments, History
 * Lazy load — not all at once.
 */

import { useCallback, useEffect, useState } from "react";
import type { DeliveryMissionSnapshot } from "@/src/core/delivery";

export type DeliveryStudioTabId =
  | "overview"
  | "artifacts"
  | "outputs"
  | "code"
  | "builds"
  | "previews"
  | "releases"
  | "deployments"
  | "history";

const TABS: { id: DeliveryStudioTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "artifacts", label: "Artifacts" },
  { id: "outputs", label: "Outputs" },
  { id: "code", label: "Code" },
  { id: "builds", label: "Builds" },
  { id: "previews", label: "Previews" },
  { id: "releases", label: "Releases" },
  { id: "deployments", label: "Deployments" },
  { id: "history", label: "History" },
];

interface Props {
  missionId: string;
}

export function DeliveryStudioTabs({ missionId }: Props) {
  const [tab, setTab] = useState<DeliveryStudioTabId>("overview");
  const [snapshot, setSnapshot] = useState<DeliveryMissionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/delivery/${encodeURIComponent(missionId)}/snapshot`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DeliveryMissionSnapshot;
      setSnapshot(data);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [missionId, loaded, loading]);

  useEffect(() => {
    if (tab !== "overview" || loaded) {
      void load();
    }
  }, [tab, load, loaded]);

  return (
    <section
      style={{
        marginTop: 24,
        borderTop: "1px solid var(--fhis-color-border, #ddd)",
        paddingTop: 16,
      }}
      aria-label="Delivery model Studio V2"
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Delivery Pipeline (6050)</h3>
        {!loaded && (
          <button
            type="button"
            onClick={() => void load()}
            style={{ fontSize: "0.75rem", cursor: "pointer" }}
          >
            {loading ? "Cargando…" : "Cargar lineage"}
          </button>
        )}
      </div>

      <nav
        style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}
        aria-label="Delivery sections"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              fontSize: "0.72rem",
              padding: "4px 8px",
              cursor: "pointer",
              border:
                tab === t.id
                  ? "1px solid var(--fhis-color-accent, #333)"
                  : "1px solid var(--fhis-color-border, #ccc)",
              background: tab === t.id ? "var(--fhis-color-surface-2, #f5f5f5)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <p style={{ color: "var(--fhis-color-danger, #a00)", fontSize: "0.8rem" }}>{error}</p>
      )}

      {loading && !snapshot && (
        <p style={{ fontSize: "0.8rem", color: "var(--fhis-color-text-muted)" }}>
          Lazy-loading delivery snapshot…
        </p>
      )}

      {snapshot && <DeliveryTabBody tab={tab} snapshot={snapshot} />}

      {!snapshot && !loading && tab === "overview" && (
        <p style={{ fontSize: "0.8rem", color: "var(--fhis-color-text-muted)" }}>
          Artifact → Output → Codebase → Build → Preview → Release → Deployment. Pulsa «Cargar
          lineage» para consultar el grafo (no se carga todo al abrir Studio).
        </p>
      )}
    </section>
  );
}

function DeliveryTabBody({
  tab,
  snapshot,
}: {
  tab: DeliveryStudioTabId;
  snapshot: DeliveryMissionSnapshot;
}) {
  switch (tab) {
    case "overview":
      return (
        <div style={{ fontSize: "0.8rem" }}>
          <p style={{ margin: "0 0 8px" }}>
            Mission <code>{snapshot.missionId}</code> —{" "}
            {snapshot.artifacts.length} artifacts · {snapshot.outputs.length} outputs ·{" "}
            {snapshot.codebases.length} codebases · {snapshot.builds.length} builds ·{" "}
            {snapshot.previews.length} previews · {snapshot.releases.length} releases ·{" "}
            {snapshot.deployments.length} deployments
          </p>
          <p style={{ margin: 0, color: "var(--fhis-color-text-muted)" }}>
            Edges: {snapshot.lineage.edges.length}
          </p>
        </div>
      );
    case "artifacts":
      return <IdList items={snapshot.artifacts.map((a) => `${a.title} (${a.artifactId}@${a.version})`)} />;
    case "outputs":
      return <IdList items={snapshot.outputs.map((o) => `${o.kind} ${o.title} (${o.outputId})`)} />;
    case "code":
      return (
        <IdList
          items={snapshot.codebases.map(
            (c) => `${c.name} ${c.version} — ${c.files.length} files (${c.codebaseId})`
          )}
        />
      );
    case "builds":
      return (
        <IdList
          items={snapshot.builds.map(
            (b) => `${b.buildId} → ${b.result} (cb ${b.codebaseId}@${b.codebaseVersion})`
          )}
        />
      );
    case "previews":
      return (
        <IdList
          items={snapshot.previews.map(
            (p) => `${p.previewId} ${p.type} build=${p.buildId ?? "visual"} [${p.status}]`
          )}
        />
      );
    case "releases":
      return (
        <IdList
          items={snapshot.releases.map(
            (r) => `${r.releaseId}@${r.version} [${r.status}] immutable=${r.immutable}`
          )}
        />
      );
    case "deployments":
      return (
        <IdList
          items={snapshot.deployments.map(
            (d) =>
              `${d.deploymentId} ${d.environment} dryRun=${d.dryRun} real=${d.realExecution} [${d.status}]`
          )}
        />
      );
    case "history":
      return (
        <IdList
          items={snapshot.lineage.edges.map((e) => `${e.from} —${e.relation}→ ${e.to}`)}
          empty="Sin edges de lineage"
        />
      );
    default:
      return null;
  }
}

function IdList({ items, empty = "Vacío" }: { items: string[]; empty?: string }) {
  if (items.length === 0) {
    return <p style={{ fontSize: "0.8rem", color: "var(--fhis-color-text-muted)" }}>{empty}</p>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem" }}>
      {items.map((item) => (
        <li key={item} style={{ marginBottom: 4 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}
