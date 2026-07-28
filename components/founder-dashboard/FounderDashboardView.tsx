"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVentures } from "@/lib/store/ventures";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { buildFounderDashboardData } from "@/lib/founder-dashboard";
import type { FounderDashboardData } from "@/lib/founder-dashboard";
import { Container } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { cn } from "@/lib/design-system/cn";
import { CeoFounderPanel } from "./CeoFounderPanel";
import { EmpresasPanel } from "./EmpresasPanel";
import { PrioridadesPanel } from "./PrioridadesPanel";
import { PortfolioPanel } from "./PortfolioPanel";
import { BuildStatusPanel } from "./BuildStatusPanel";
import { CapitalPanel } from "./CapitalPanel";
import { CalendarioPanel } from "./CalendarioPanel";
import { ActividadPanel } from "./ActividadPanel";

export function FounderDashboardView() {
  const [data, setData] = useState<FounderDashboardData | null>(null);

  useEffect(() => {
    ensureVandlSeeded();
    setData(buildFounderDashboardData(getVentures()));
  }, []);

  if (!data) {
    return (
      <Container className="fhis-founder-dashboard">
        <div className="fhis-dashboard-loading">
          <span className="fhis-vpc-pulse" />
          Cargando Venture OS…
        </div>
      </Container>
    );
  }

  const { header } = data;

  return (
    <Container className="fhis-founder-dashboard">
      <header className="fhis-founder-header">
        <div>
          <p className="fhis-dashboard-kicker">{header.kicker}</p>
          <h1 className="fhis-section-header-title">{header.title}</h1>
          <p className="fhis-founder-header-sub">{header.subtitle}</p>
        </div>
        <div className="fhis-founder-header-badges">
          <Badge variant="accent">{header.ventureCount} empresas</Badge>
          {header.priorityCount > 0 && (
            <Badge variant="red">{header.priorityCount} prioridades</Badge>
          )}
          <Link href="/" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            + Crear Empresa
          </Link>
          <Link href="/creator" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            Creator
          </Link>
          <Link href={`/venture/${VANDL_VENTURE_ID}`} className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            VANDL
          </Link>
          <Link href="/lab/rc1" className={cn("fhis-btn", "fhis-btn-ghost", "fhis-btn-sm")}>
            RC1
          </Link>
        </div>
      </header>

      <PortfolioPanel portfolio={data.portfolio} />

      <div className="fhis-founder-main-grid">
        <div className="fhis-founder-primary-col">
          <CeoFounderPanel ceo={data.ceo} />
          <EmpresasPanel empresas={data.empresas} />
          <BuildStatusPanel build={data.build} />
        </div>

        <aside className="fhis-founder-sidebar-col">
          <PrioridadesPanel prioridades={data.prioridades} />
          <CapitalPanel capital={data.capital} />
          <CalendarioPanel calendario={data.calendario} />
          <ActividadPanel actividad={data.actividad} />
        </aside>
      </div>
    </Container>
  );
}
