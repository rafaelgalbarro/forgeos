"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import { runEcosystemLab, type EcosystemLabSnapshot } from "@/lib/lab/ecosystem-lab";
import { searchEcosystemPacks } from "@/lib/marketplace";
import { resolvePackDependencies } from "@/lib/ecosystem/dependency-resolver";
import { simulateInstall } from "@/lib/ecosystem/installation-engine";
import type { EcosystemPack, InstallSimulationResult } from "@/lib/ecosystem/types";
import { PackInstallSimulator } from "./PackInstallSimulator";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

export function EcosystemLabView({ initialPackId }: { initialPackId?: string }) {
  const [data, setData] = useState<EcosystemLabSnapshot | null>(null);
  const [query, setQuery] = useState("CRM");
  const [selectedPack, setSelectedPack] = useState<EcosystemPack | null>(null);
  const [installResult, setInstallResult] = useState<InstallSimulationResult | null>(null);
  const [searchResults, setSearchResults] = useState<EcosystemPack[]>([]);

  useEffect(() => {
    runEcosystemLab().then((snap) => {
      setData(snap);
      const packId = initialPackId ?? "eco-pack-crm";
      const pack = snap.crmPacks.find((p) => p.id === packId) ?? snap.crmPack;
      setSelectedPack(pack);
      setSearchResults(snap.crmPacks);
    });
  }, [initialPackId]);

  const handleSearch = useCallback(() => {
    const results = searchEcosystemPacks({ query }).packs;
    setSearchResults(results);
    if (results.length > 0 && !selectedPack) {
      setSelectedPack(results[0]);
    }
  }, [query, selectedPack]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  function handleSelectPack(pack: EcosystemPack) {
    setSelectedPack(pack);
    setInstallResult(null);
  }

  function handleSimulateInstall() {
    if (!selectedPack) return;
    const result = simulateInstall({
      packId: selectedPack.id,
      ventureId: LAB_MOCK_VENTURE_ID,
      mode: "simulate",
    });
    setInstallResult(result);
  }

  if (!data) {
    return (
      <Container>
        <p>Cargando Ecosystem Lab…</p>
      </Container>
    );
  }

  const deps = selectedPack ? resolvePackDependencies(selectedPack.id) : null;

  return (
    <Container className="fhis-ecosystem-lab">
      <SectionHeader
        title="Ecosystem Lab"
        subtitle="RC9 — Demo sandbox: CRM Pack → dependencias → simular instalación"
      />

      <Stack gap="lg">
        <Panel>
          <div className="fhis-ecosystem-kpi-grid">
            <KpiBlock label="Total Packs" value={String(data.totalPacks)} />
            <KpiBlock label="Plugins" value={String(data.plugins.length)} />
            <KpiBlock label="SDK Modules" value={String(data.sdkModules.length)} />
            <KpiBlock label="Creators" value={String(data.creatorStats.totalListings)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="1. Buscar packs" subtitle='Demo: buscar "CRM"' />
          <div className="fhis-ecosystem-search-bar">
            <input
              type="search"
              className="fhis-input"
              placeholder="Buscar CRM…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="fhis-btn fhis-btn-md fhis-btn-primary" onClick={handleSearch}>
              Buscar
            </button>
          </div>
          <div className="fhis-ecosystem-pack-list">
            {searchResults.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className={`fhis-ecosystem-pack-select${selectedPack?.id === pack.id ? " fhis-ecosystem-pack-select--active" : ""}`}
                onClick={() => handleSelectPack(pack)}
              >
                <strong>{pack.name}</strong>
                <Badge variant="default">{pack.packType}</Badge>
              </button>
            ))}
          </div>
        </Panel>

        {selectedPack && deps && (
          <Panel>
            <SectionHeader title="2. Dependencias" subtitle={selectedPack.name} />
            <div className="fhis-ecosystem-filter-row">
              {deps.graph.map((e) => (
                <Badge key={`${e.from}-${e.to}`} variant="accent">
                  {e.to}
                </Badge>
              ))}
            </div>
            <p className="fhis-ecosystem-pack-desc">
              Resueltas: {deps.resolved.join(", ") || "ninguna"}
            </p>
          </Panel>
        )}

        {selectedPack && (
          <Panel>
            <SectionHeader title="3. Simular instalación" subtitle="Sandbox — sin instalación real" />
            <button
              type="button"
              className="fhis-btn fhis-btn-md fhis-btn-primary"
              onClick={handleSimulateInstall}
            >
              Simular instalación de {selectedPack.name}
            </button>
            <PackInstallSimulator result={installResult} />
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Creator Economy" subtitle="Catálogo mock" />
          <div className="fhis-ecosystem-pack-list">
            {data.creatorListings.slice(0, 6).map((c) => (
              <div key={c.id} className="fhis-ecosystem-pack-row">
                <strong>{c.title}</strong>
                <Badge variant="default">{c.assetType}</Badge>
                <span>{c.priceLabel}</span>
              </div>
            ))}
          </div>
        </Panel>

        <p className="fhis-ecosystem-links">
          <Link href="/marketplace">Marketplace →</Link>
          {" · "}
          <Link href="/store">Store →</Link>
          {" · "}
          <Link href="/plugins">Plugins →</Link>
        </p>
      </Stack>
    </Container>
  );
}
