"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { VentureWorkspaceSnapshot } from "@/lib/venture-workspace";
import { WORKSPACE_SECTIONS } from "@/lib/venture-workspace";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { Status } from "@/components/ui/fhis/Status";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { cn } from "@/lib/design-system/cn";
import { VentureExportMenu } from "@/components/venture/VentureExportMenu";
import { FounderLifecyclePipeline } from "./FounderLifecyclePipeline";

interface VentureWorkspaceShellProps {
  data: VentureWorkspaceSnapshot;
  activeSection: string;
  onSectionChange: (id: string) => void;
  children: ReactNode;
}

export function VentureWorkspaceShell({
  data,
  activeSection,
  onSectionChange,
  children,
}: VentureWorkspaceShellProps) {
  const groups = WORKSPACE_SECTIONS.reduce<Record<string, typeof WORKSPACE_SECTIONS>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <div className="venture-workspace fhis-vws">
      <header className="fhis-venture-topbar">
        <Link href="/dashboard" className="fhis-sidebar-logo">
          Forge<span>OS</span>
        </Link>
        <div className="venture-topbar-center">
          <h1 style={{ margin: 0, fontSize: "var(--fhis-text-lg)" }}>{data.venture.name}</h1>
          <Status status="active" label={data.currentState} />
        </div>
        <div className="venture-topbar-actions" style={{ display: "flex", gap: "var(--fhis-space-2)", alignItems: "center", flexWrap: "wrap" }}>
          <VentureExportMenu venture={data.venture} />
          <Link href={`/venture/${data.venture.id}/timeline`} className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Timeline
          </Link>
          <Link href={`/venture/${data.venture.id}/knowledge`} className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Knowledge
          </Link>
          <Link href="/founder" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Founder
          </Link>
          <Link href="/ceo" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            CEO
          </Link>
          <Link href="/creator" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Creator
          </Link>
          <Link href="/" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Nueva idea
          </Link>
          <Link href="/projects" className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}>
            Empresas
          </Link>
        </div>
      </header>

      <Panel className="fhis-vws-lifecycle-panel">
        <SectionHeader title="Ciclo de vida del fundador" subtitle="Idea → Validación → Mercado → Producto → Construcción → Lanzamiento → Crecimiento" />
        <FounderLifecyclePipeline steps={data.founderLifecycle} />
        <div className="fhis-vws-lifecycle-meta">
          <Badge variant="blue">{data.lifeStageLabel}</Badge>
          <Badge variant="accent">{data.statusBadgeLabel}</Badge>
          <span style={{ color: "var(--fhis-color-text-muted)", fontSize: "var(--fhis-text-sm)" }}>
            Etapa activa: <strong>{data.founderLifecycle.find((s) => s.status === "active")?.label ?? data.lifeStageLabel}</strong>
          </span>
        </div>
      </Panel>

      <div className="venture-body fhis-vws-body">
        <nav className="venture-sidebar fhis-vws-nav">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="venture-nav-group">
              <span className="venture-nav-group-label">{group}</span>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "fhis-venture-nav-item",
                    activeSection === item.id && "fhis-venture-nav-item-active"
                  )}
                  onClick={() => onSectionChange(item.id)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="fhis-vws-content">{children}</div>
      </div>
    </div>
  );
}
