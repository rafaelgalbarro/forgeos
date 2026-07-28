"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { VentureSimulatorPanel } from "@/components/studio/VentureSimulatorPanel";
import { BuildPlanPanel } from "@/components/venture/BuildPlanPanel";
import { VentureMemoryPanel } from "@/components/venture/VentureMemoryPanel";
import { VentureExportMenu } from "@/components/venture/VentureExportMenu";
import { VENTURE_NAV } from "@/lib/domain/venture";
import type { VentureProject, VentureSectionId } from "@/lib/domain/venture";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Status } from "@/components/ui/fhis/Status";
import { cn } from "@/lib/design-system/cn";

interface VentureWorkspaceProps {
  venture: VentureProject;
}

export function VentureWorkspace({ venture }: VentureWorkspaceProps) {
  const [activeId, setActiveId] = useState<VentureSectionId>("resumen");
  const activeSection = venture.sections.find((s) => s.id === activeId) ?? venture.sections[0];
  const isSimulator = activeId === "simulator";
  const isBuildPlan = activeId === "build-plan";
  const isMemoria = activeId === "memoria";
  const isCustomPanel = isSimulator || isBuildPlan || isMemoria;

  const navItems = VENTURE_NAV.filter(
    (item) =>
      item.id !== "decisiones" || (venture.discoveryContext?.answers.length ?? 0) > 0
  );

  const groups = navItems.reduce<Record<string, typeof VENTURE_NAV>>((acc, item) => {
    const g = item.group ?? "General";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  return (
    <div className="venture-workspace">
      <header className="fhis-venture-topbar">
        <Link href="/" className="fhis-sidebar-logo">Forge<span>OS</span></Link>
        <div className="venture-topbar-center">
          <h1 style={{ margin: 0, fontSize: "var(--fhis-text-lg)" }}>{venture.name}</h1>
          <Status status="active" label="Startup Package" />
        </div>
        <div className="venture-topbar-actions" style={{ display: "flex", gap: "var(--fhis-space-2)", alignItems: "center" }}>
          <Link
            href={`/founder-journey?ventureId=${venture.id}`}
            className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}
            style={{ opacity: 0.85 }}
          >
            Tu recorrido
          </Link>
          <VentureExportMenu venture={venture} />
          <Link href="/" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>Nueva idea</Link>
          <Link href="/projects" className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}>Empresas</Link>
        </div>
      </header>

      <div className="venture-body">
        <nav className="venture-sidebar">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="venture-nav-group">
              <span className="venture-nav-group-label">{group}</span>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={clsx("fhis-venture-nav-item", activeId === item.id && "fhis-venture-nav-item-active")}
                  onClick={() => setActiveId(item.id)}
                >
                  {item.title}
                  {item.id === "prd" && venture.productPRDSource === "ai" && (
                    <Badge variant="accent">IA</Badge>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <Panel className={clsx("venture-document", isCustomPanel && "venture-document-simulator")}>
          {isSimulator ? (
            <VentureSimulatorPanel venture={venture} />
          ) : isBuildPlan ? (
            <BuildPlanPanel venture={venture} />
          ) : isMemoria ? (
            <VentureMemoryPanel venture={venture} />
          ) : activeSection ? (
            <>
              <header className="venture-doc-header">
                <SectionHeader title={activeSection.title} />
                {activeSection.id === "prd" && venture.productPRDSource === "ai" && (
                  <Badge variant="accent">Generado con IA</Badge>
                )}
              </header>
              <div className={clsx("venture-doc-content", activeSection.format === "code" && "venture-doc-code")}>
                <pre><code>{activeSection.content}</code></pre>
              </div>
            </>
          ) : (
            <p style={{ color: "var(--fhis-color-text-muted)" }}>Sin contenido.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
