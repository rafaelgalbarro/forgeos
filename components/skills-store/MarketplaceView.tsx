"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  browseCatalog,
  getFeaturedListings,
  getMarketplaceStats,
  syncStoreState,
} from "@/lib/skills-store";
import type { MarketplaceListing, StoreCategory } from "@/lib/skills-store";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORIES: { id: StoreCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "skills", label: "Skills" },
  { id: "departments", label: "Departments" },
  { id: "workers", label: "Workers" },
  { id: "templates", label: "Templates" },
  { id: "knowledge-packs", label: "Knowledge" },
  { id: "build-packs", label: "Build Packs" },
  { id: "prompt-packs", label: "Prompts" },
  { id: "providers", label: "Providers" },
];

export function MarketplaceView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StoreCategory | "all">("all");
  const [featured, setFeatured] = useState<MarketplaceListing[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getMarketplaceStats> | null>(null);

  useEffect(() => {
    syncStoreState();
    setFeatured(getFeaturedListings(8));
    setStats(getMarketplaceStats());
  }, []);

  const results = useMemo(() => {
    const filter = {
      query: query || undefined,
      category: category === "all" ? undefined : category,
    };
    return browseCatalog(filter);
  }, [query, category]);

  const resultItems = results?.items ?? [];
  const resultTotal = results?.total ?? resultItems.length;

  return (
    <Container className="fhis-marketplace">
      <SectionHeader
        title="ForgeOS Marketplace"
        subtitle="RC4.8 — Browse Skills, Packs, Templates, and Providers (mock/local)"
      />

      <Stack gap="lg">
        {stats && (
          <Panel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KpiBlock label="Listings" value={String(stats.totalListings)} />
              <KpiBlock label="Featured" value={String(stats.featured)} />
              <KpiBlock label="Avg Rating" value={String(stats.avgRating)} />
              <KpiBlock label="Installs" value={String(stats.totalInstalls)} />
            </div>
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Featured" subtitle="Top marketplace picks" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {featured.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  border: "1px solid var(--fhis-color-border)",
                  borderRadius: 8,
                }}
              >
                <strong style={{ fontSize: 14 }}>{item.title}</strong>
                <p style={{ fontSize: 12, opacity: 0.75, margin: "6px 0" }}>{item.subtitle}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <Badge variant="accent">★ {item.rating}</Badge>
                  <Badge variant="default">{item.category}</Badge>
                  {item.badges.slice(0, 2).map((b) => (
                    <Badge key={b} variant="default">
                      {b}
                    </Badge>
                  ))}
                </div>
                <span style={{ fontSize: 11, opacity: 0.6 }}>
                  {item.installCount} installs · {item.priceLabel}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Browse" subtitle={`${resultTotal} items`} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input
              type="search"
              placeholder="Search marketplace…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--fhis-color-border)",
              }}
            />
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--fhis-color-border)",
                  background: category === c.id ? "var(--fhis-color-accent-muted)" : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 6, maxHeight: 400, overflow: "auto" }}>
            {resultItems.length === 0 ? (
              <EmptyState icon="◇" title="Sin resultados" description="Prueba otra búsqueda o categoría." />
            ) : (
            resultItems.slice(0, 40).map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 8,
                  fontSize: 12,
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span style={{ opacity: 0.7, marginLeft: 8 }}>{item.description.slice(0, 60)}</span>
                </div>
                <Badge variant="default">{item.category}</Badge>
                <Badge variant="default">{item.status}</Badge>
              </div>
            ))
            )}
          </div>

          <p style={{ marginTop: 12, fontSize: 13 }}>
            <Link href="/store">Open Official Store →</Link>
            {" · "}
            <Link href="/lab/skill-store">Skill Store Lab →</Link>
          </p>
        </Panel>
      </Stack>
    </Container>
  );
}
