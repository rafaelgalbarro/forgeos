"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getCombinedMarketplaceStats,
  getEcosystemFeatured,
  searchEcosystemPacks,
  syncStoreState,
} from "@/lib/marketplace";
import type { EcosystemPack, EcosystemPackType } from "@/lib/ecosystem/types";
import { MarketplaceView } from "@/components/skills-store/MarketplaceView";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

const PACK_TYPES: { id: EcosystemPackType | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "skills", label: "Skills" },
  { id: "capabilities", label: "Capabilities" },
  { id: "departments", label: "Departments" },
  { id: "workers", label: "Workers" },
  { id: "templates", label: "Templates" },
  { id: "knowledge-packs", label: "Knowledge" },
  { id: "prompt-packs", label: "Prompts" },
  { id: "ai-packs", label: "AI Packs" },
  { id: "business-packs", label: "Business" },
  { id: "build-packs", label: "Build" },
  { id: "plugins", label: "Plugins" },
];

export function EcosystemMarketplaceView() {
  const [query, setQuery] = useState("");
  const [packType, setPackType] = useState<EcosystemPackType | "all">("all");
  const [stats, setStats] = useState<ReturnType<typeof getCombinedMarketplaceStats> | null>(null);
  const [featured, setFeatured] = useState<ReturnType<typeof getEcosystemFeatured>>([]);

  useEffect(() => {
    syncStoreState();
    setStats(getCombinedMarketplaceStats());
    setFeatured(getEcosystemFeatured(6));
  }, []);

  const results = useMemo(() => {
    return searchEcosystemPacks({
      query: query || undefined,
      packType: packType === "all" ? undefined : packType,
    });
  }, [query, packType]);

  return (
    <Stack gap="lg">
      <Container className="fhis-ecosystem-marketplace">
        <SectionHeader
          title="ForgeOS Ecosystem Marketplace"
          subtitle="RC9 — Packs extensibles: Skills, Capabilities, Plugins, Business Packs (sandbox)"
        />

        <Stack gap="lg">
          {stats && (
            <Panel>
              <div className="fhis-ecosystem-kpi-grid">
                <KpiBlock label="Listings combinados" value={String(stats.combined.totalListings)} />
                <KpiBlock label="Ecosystem Packs" value={String(stats.ecosystem.totalPacks)} />
                <KpiBlock label="Plugins" value={String(stats.ecosystem.plugins)} />
                <KpiBlock label="Skill Store" value={String(stats.skillStore.totalListings)} />
              </div>
            </Panel>
          )}

          <Panel>
            <SectionHeader title="Ecosystem Packs" subtitle={`${results.total} packs encontrados`} />
            <div className="fhis-ecosystem-search-bar">
              <input
                type="search"
                className="fhis-input"
                placeholder="Buscar packs (ej. CRM)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="fhis-ecosystem-filter-row">
                {PACK_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`fhis-btn fhis-btn-sm fhis-btn-secondary${packType === t.id ? " fhis-ecosystem-filter--active" : ""}`}
                    onClick={() => setPackType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {featured.length > 0 && !query && packType === "all" && (
              <div className="fhis-ecosystem-featured-grid">
                {featured.map((item) => (
                  <div key={item.id} className="fhis-ecosystem-pack-card">
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                    <div className="fhis-ecosystem-pack-badges">
                      <Badge variant="accent">★ {item.rating}</Badge>
                      <Badge variant="default">{item.packType}</Badge>
                      <Badge variant="default">{item.priceLabel}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="fhis-ecosystem-pack-list">
              {results.packs.slice(0, 30).map((pack: EcosystemPack) => (
                <div key={pack.id} className="fhis-ecosystem-pack-row">
                  <div>
                    <strong>{pack.name}</strong>
                    <span className="fhis-ecosystem-pack-desc">{pack.description.slice(0, 70)}</span>
                  </div>
                  <Badge variant="default">{pack.packType}</Badge>
                  <Badge variant="default">{pack.priceLabel}</Badge>
                  <Link href={`/lab/ecosystem?pack=${pack.id}`}>Simular →</Link>
                </div>
              ))}
            </div>

            <p className="fhis-ecosystem-links">
              <Link href="/store">Official Store →</Link>
              {" · "}
              <Link href="/plugins">Plugins →</Link>
              {" · "}
              <Link href="/lab/ecosystem">Ecosystem Lab →</Link>
            </p>
          </Panel>
        </Stack>
      </Container>

      <MarketplaceView />
    </Stack>
  );
}
