"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPlugins, simulatePluginLoad } from "@/lib/plugins";
import type { PluginManifest } from "@/lib/plugins";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";

export function PluginsView() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadMsg, setLoadMsg] = useState<string | null>(null);

  useEffect(() => {
    setPlugins(listPlugins());
  }, []);

  function handleSimulateLoad(id: string) {
    setSelected(id);
    const result = simulatePluginLoad(id);
    setLoadMsg(result.message);
  }

  return (
    <Container className="fhis-ecosystem-plugins">
      <SectionHeader
        title="ForgeOS Plugins"
        subtitle="RC9 — Plugins sandbox (sin ejecución real en runtime)"
      />

      <Stack gap="lg">
        <Panel>
          <SectionHeader title="Catálogo de Plugins" subtitle={`${plugins.length} plugins disponibles`} />
          <div className="fhis-ecosystem-pack-list">
            {plugins.map((p) => (
              <div key={p.id} className="fhis-ecosystem-pack-row">
                <div>
                  <strong>{p.name}</strong>
                  <span className="fhis-ecosystem-pack-desc">{p.description}</span>
                </div>
                <Badge variant="default">v{p.version}</Badge>
                <Status status={p.status === "active" ? "success" : "idle"} label={p.status} />
                <button
                  type="button"
                  className="fhis-btn fhis-btn-sm fhis-btn-secondary"
                  onClick={() => handleSimulateLoad(p.id)}
                >
                  Cargar (sandbox)
                </button>
              </div>
            ))}
          </div>
          {loadMsg && selected && (
            <p className="fhis-ecosystem-sandbox-msg">{loadMsg}</p>
          )}
        </Panel>

        {selected && (
          <Panel>
            <SectionHeader title="Hooks registrados" subtitle={selected} />
            <div className="fhis-ecosystem-filter-row">
              {plugins
                .find((p) => p.id === selected)
                ?.hooks.map((h) => (
                  <Badge key={h} variant="accent">
                    {h}
                  </Badge>
                ))}
            </div>
          </Panel>
        )}

        <p className="fhis-ecosystem-links">
          <Link href="/marketplace">Marketplace →</Link>
          {" · "}
          <Link href="/sdk">SDK →</Link>
          {" · "}
          <Link href="/lab/ecosystem">Ecosystem Lab →</Link>
        </p>
      </Stack>
    </Container>
  );
}
