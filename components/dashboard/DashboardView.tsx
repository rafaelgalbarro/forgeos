"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVentures } from "@/lib/store/ventures";
import { buildPortfolioDashboardData } from "@/lib/portfolio/index";
import type { PortfolioDashboardData } from "@/lib/portfolio/types";
import { Container } from "@/components/ui/fhis/Layout";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { cn } from "@/lib/design-system/cn";
import { ActivityFeed } from "./ActivityFeed";
import { CeoBriefingCard } from "./CeoBriefingCard";
import { DashboardHeader } from "./DashboardHeader";
import { PortfolioMetricsRow } from "./PortfolioMetricCard";
import { VenturePortfolioCardView } from "./VenturePortfolioCard";

export function DashboardView() {
  const [data, setData] = useState<PortfolioDashboardData | null>(null);

  useEffect(() => {
    setData(buildPortfolioDashboardData(getVentures()));
  }, []);

  if (!data) {
    return (
      <Container className="fhis-dashboard">
        <div className="fhis-dashboard-loading">
          <span className="fhis-vpc-pulse" />
          Cargando portfolio…
        </div>
      </Container>
    );
  }

  return (
    <Container className="fhis-dashboard">
      <DashboardHeader header={data.header} />

      <PortfolioMetricsRow metrics={data.metrics} />

      <CeoBriefingCard briefing={data.ceoBriefing} />

      <div className="dash-future-slots" aria-hidden="true" data-slots="fos,board,build" />

      <div className="fhis-dashboard-body">
        <section id="portfolio">
          <div className="fhis-dashboard-portfolio-head">
            <SectionHeader title="Centro de operaciones" />
            <Badge variant="accent">
              {data.ventures.length} startup{data.ventures.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {data.ventures.length === 0 ? (
            <EmptyState
              icon="◫"
              title="Tu portfolio está vacío"
              description="ForgeOS está listo para ayudarte a validar y construir tu primera empresa digital."
            >
              <Link href="/" className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-md")}>
                + Crear Empresa
              </Link>
            </EmptyState>
          ) : (
            <div className="fhis-dashboard-portfolio-grid">
              {data.ventures.map((venture) => (
                <VenturePortfolioCardView key={venture.id} venture={venture} />
              ))}
            </div>
          )}
        </section>

        <ActivityFeed
          recentActivity={data.recentActivity}
          upcomingActions={data.upcomingActions}
        />
      </div>
    </Container>
  );
}
