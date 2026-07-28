"use client";

import { useState } from "react";
import Link from "next/link";
import { getSdkApiSurface, getSdkQuickStart, listSdkModules } from "@/lib/sdk";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

const modules = listSdkModules();
const quickStart = getSdkQuickStart();
const apiSurface = getSdkApiSurface();

export function SdkView() {
  const [activeModule, setActiveModule] = useState(modules[0]?.id ?? "sdk-core");

  const mod = modules.find((m) => m.id === activeModule);

  return (
    <Container className="fhis-ecosystem-sdk">
      <SectionHeader
        title="ForgeOS SDK"
        subtitle="RC9 — SDK para marketplace, plugins, ventures y AI Runtime (sandbox)"
      />

      <Stack gap="lg">
        <Panel>
          <SectionHeader title="Módulos SDK" subtitle="Superficie de desarrollo extensible" />
          <div className="fhis-ecosystem-filter-row">
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`fhis-btn fhis-btn-sm fhis-btn-secondary${activeModule === m.id ? " fhis-ecosystem-filter--active" : ""}`}
                onClick={() => setActiveModule(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          {mod && (
            <div className="fhis-ecosystem-sdk-detail">
              <p>{mod.description}</p>
              <Badge variant="default">v{mod.version}</Badge>
              <div className="fhis-ecosystem-filter-row">
                {mod.exports.map((e) => (
                  <Badge key={e} variant="accent">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Quick Start" subtitle="Instalación y ejemplo (sandbox)" />
          <pre className="fhis-ecosystem-code">{quickStart.install}</pre>
          <pre className="fhis-ecosystem-code">{quickStart.import}</pre>
          <pre className="fhis-ecosystem-code">{quickStart.example}</pre>
        </Panel>

        <Panel>
          <SectionHeader title="API Surface" subtitle="Exports por módulo" />
          {apiSurface.map((s) => (
            <div key={s.module} className="fhis-ecosystem-pack-row">
              <strong>{s.module}</strong>
              <span className="fhis-ecosystem-pack-desc">{s.exports.join(", ")}</span>
            </div>
          ))}
        </Panel>

        <p className="fhis-ecosystem-links">
          <Link href="/plugins">Plugins →</Link>
          {" · "}
          <Link href="/marketplace">Marketplace →</Link>
          {" · "}
          <Link href="/lab/ecosystem">Ecosystem Lab →</Link>
        </p>
      </Stack>
    </Container>
  );
}
