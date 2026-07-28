"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  browseCatalog,
  countByCategory,
  getInstalledSummary,
  installItem,
  isItemInstalled,
  readInstalledItems,
  syncStoreState,
  uninstallItem,
} from "@/lib/skills-store";
import type { InstalledItem, StoreCategory, StoreItem } from "@/lib/skills-store";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";

const INSTALLABLE: StoreCategory[] = [
  "skills",
  "departments",
  "workers",
  "templates",
  "knowledge-packs",
  "build-packs",
  "prompt-packs",
  "providers",
];

export function StoreView() {
  const ventureId = LAB_MOCK_VENTURE_ID;
  const [category, setCategory] = useState<StoreCategory>("skills");
  const [items, setItems] = useState<StoreItem[]>([]);
  const [installed, setInstalled] = useState<InstalledItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<StoreCategory, number> | null>(null);

  const refresh = useCallback(() => {
    syncStoreState();
    setItems(browseCatalog({ category }).items);
    setInstalled(readInstalledItems(ventureId));
    setCounts(countByCategory());
  }, [category, ventureId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleInstall(itemId: string) {
    const result = installItem(itemId, ventureId);
    setMessage(result.message);
    refresh();
  }

  function handleUninstall(itemId: string) {
    const result = uninstallItem(itemId, ventureId);
    setMessage(result.message);
    refresh();
  }

  const summary = getInstalledSummary(ventureId);

  return (
    <Container className="fhis-skill-store">
      <SectionHeader
        title="Official Skill Store"
        subtitle="RC4.8 — Install and manage packs for your venture workspace"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiBlock label="Catalog" value={String(counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0)} />
            <KpiBlock label="Installed" value={String(summary.total)} />
            <KpiBlock label="Skills" value={String(counts?.skills ?? 0)} />
            <KpiBlock label="Venture" value={ventureId.slice(0, 12)} />
          </div>
          {message && (
            <p style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>{message}</p>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Categories" subtitle="Select a category to install" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {INSTALLABLE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--fhis-color-border)",
                  background: category === c ? "var(--fhis-color-accent-muted)" : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {c} ({counts?.[c] ?? 0})
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 6, maxHeight: 320, overflow: "auto" }}>
            {items.slice(0, 30).map((item) => {
              const isInst = isItemInstalled(item.id, ventureId);
              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 12,
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--fhis-color-border)",
                  }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span style={{ opacity: 0.7, marginLeft: 8 }}>v{item.version}</span>
                  </div>
                  <Badge variant="default">{item.status}</Badge>
                  <Status status={isInst ? "success" : "idle"} label={isInst ? "Installed" : "Available"} />
                  <button
                    type="button"
                    onClick={() => (isInst ? handleUninstall(item.id) : handleInstall(item.id))}
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      borderRadius: 4,
                      border: "1px solid var(--fhis-color-border)",
                      cursor: "pointer",
                    }}
                  >
                    {isInst ? "Remove" : "Install"}
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Installed" subtitle={`${installed.length} items in venture workspace`} />
          <div style={{ fontSize: 12, maxHeight: 160, overflow: "auto" }}>
            {installed.length === 0 && <p>No items installed yet.</p>}
            {installed.map((i) => (
              <div key={`${i.itemId}-${i.installedAt}`} style={{ padding: "4px 0" }}>
                {i.itemId} · {i.category} · v{i.version}
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 13 }}>
            <Link href="/marketplace">Browse Marketplace →</Link>
            {" · "}
            <Link href="/lab/skill-store">Skill Store Lab →</Link>
          </p>
        </Panel>
      </Stack>
    </Container>
  );
}
