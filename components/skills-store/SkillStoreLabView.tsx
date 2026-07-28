"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { runSkillStoreLab, type SkillStoreLabSnapshot } from "@/lib/lab/skill-store-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { LoadingState } from "@/components/ui/LoadingState";

export function SkillStoreLabView() {
  const [data, setData] = useState<SkillStoreLabSnapshot | null>(null);

  useEffect(() => {
    runSkillStoreLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <LoadingState title="Cargando Skill Store Lab…" description="RC4.8 — catalog, installed items, marketplace" />
      </Container>
    );
  }

  const providerItems = data.providers?.items ?? [];

  return (
    <Container className="fhis-skill-store-lab">
      <SectionHeader
        title="Universal Skill Store Lab"
        subtitle="RC4.8 — Catalog, installed items, dependency graph, versions, marketplace stats"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <KpiBlock label="Catalog Total" value={String(data.catalogTotal)} />
            <KpiBlock label="Installed" value={String(data.installedSummary.total)} />
            <KpiBlock label="Listings" value={String(data.marketplaceStats.totalListings)} />
            <KpiBlock label="Avg Rating" value={String(data.marketplaceStats.avgRating)} />
            <KpiBlock label="Dep Graphs" value={String(data.dependencyGraphs.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Category Counts" subtitle="Store inventory by category" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(data.categoryCounts).map(([cat, count]) => (
              <Badge key={cat} variant="default">
                {cat}: {count}
              </Badge>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Dependency Graph" subtitle={data.sampleGraph?.name ?? "Sample"} />
          {data.sampleGraph ? (
            <div style={{ fontSize: 12 }}>
              <p style={{ marginBottom: 8 }}>
                Root: <strong>{data.sampleGraph.rootId}</strong> · {data.sampleGraph.nodes.length} nodes ·{" "}
                {data.sampleGraph.edges.length} edges
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {data.sampleGraph.nodes.map((n) => (
                  <Badge key={n.id} variant="accent">
                    {n.name}
                  </Badge>
                ))}
              </div>
              <div style={{ maxHeight: 100, overflow: "auto" }}>
                {data.sampleGraph.edges.map((e, i) => (
                  <div key={i}>
                    {e.from} → {e.to} ({e.type})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>No dependency graph available.</p>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Installed Items" subtitle={`Venture: ${data.ventureId}`} />
          <div style={{ fontSize: 12, maxHeight: 120, overflow: "auto" }}>
            {data.installed.map((i) => (
              <div key={`${i.itemId}-${i.installedAt}`}>
                {i.itemId} · {i.category} · v{i.version}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Marketplace Featured" subtitle="Top listings" />
          <div style={{ display: "grid", gap: 6, maxHeight: 160, overflow: "auto", fontSize: 12 }}>
            {data.marketplaceFeatured.map((m) => (
              <div key={m.id}>
                {m.title} · ★ {m.rating} · {m.category} · {m.installCount} installs
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Providers" subtitle={`${data.providers?.total ?? providerItems.length} provider listings`} />
          <div style={{ display: "grid", gap: 4, maxHeight: 120, overflow: "auto", fontSize: 12 }}>
            {providerItems.length === 0 ? (
              <p>No providers available.</p>
            ) : (
            providerItems.slice(0, 12).map((p) => (
              <div key={p.id}>
                {p.name} — {p.description.slice(0, 50)}
              </div>
            ))
            )}
          </div>
          <p style={{ marginTop: 12, fontSize: 13 }}>
            <Link href="/marketplace">Marketplace →</Link>
            {" · "}
            <Link href="/store">Official Store →</Link>
          </p>
        </Panel>
      </Stack>
    </Container>
  );
}
