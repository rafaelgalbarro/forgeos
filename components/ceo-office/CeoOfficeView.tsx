"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PortfolioMetricsRow } from "@/components/dashboard/PortfolioMetricCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CeoOfficeHeaderView } from "./CeoOfficeHeaderView";
import { AbsenceTimeline } from "./AbsenceTimeline";
import { HeadquartersPanel } from "./HeadquartersPanel";
import { VentureHealthPanel } from "./VentureHealthPanel";
import { NotificationCenter } from "./NotificationCenter";
import { FocusModeOverlay } from "./FocusModeOverlay";
import { ExecutiveCard } from "@/components/ui";
import { CeoBriefingCard } from "@/components/dashboard/CeoBriefingCard";
import { CeoInsightsPanel } from "./CeoInsightsPanel";
import { BoardPanel } from "./BoardPanel";
import { BuildQueuePanel } from "./BuildQueuePanel";
import { useCeoOfficeData } from "./useCeoOfficeData";

function CeoOfficeSkeleton() {
  return (
    <div className="ceo-office">
      <div className="ceo-office-skeleton glass">
        <div className="ceo-skeleton-line ceo-skeleton-title" />
        <div className="ceo-skeleton-line" />
        <div className="ceo-skeleton-line ceo-skeleton-short" />
        <div className="ceo-skeleton-grid">
          <div className="ceo-skeleton-block" />
          <div className="ceo-skeleton-block" />
        </div>
      </div>
    </div>
  );
}

function CeoOfficeDegraded({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ceo-office">
      <div className="dash-empty glass ceo-degraded">
        <h3>CEO Office — modo degradado</h3>
        <p>{message}</p>
        <p className="ceo-degraded-hint">
          Revisa la consola del navegador (F12) para más detalle.
        </p>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Reintentar
        </button>
        <Link href="/" className="btn btn-ghost">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

export function CeoOfficeView() {
  const { data, error, ready, retry } = useCeoOfficeData();
  const [focusMode, setFocusMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const focusVenture = useMemo(
    () => data?.executiveVentures[0] ?? null,
    [data]
  );

  if (!ready || !data) {
    if (error) {
      return <CeoOfficeDegraded message={error} onRetry={retry} />;
    }
    return <CeoOfficeSkeleton />;
  }

  if (focusMode && focusVenture) {
    return (
      <div className="ceo-office ceo-office-focus">
        <FocusModeOverlay
          venture={focusVenture}
          briefing={data.portfolio.ceoBriefing}
          smartAction={data.smartAction}
          onExit={() => setFocusMode(false)}
        />
      </div>
    );
  }

  return (
    <div className="ceo-office">
      {error && (
        <div className="ceo-degraded-banner" role="status">
          Modo parcial: {error}
        </div>
      )}

      <CeoOfficeHeaderView
        header={data.header}
        smartAction={data.smartAction}
        onFocusMode={() => setFocusMode(true)}
        notificationCount={data.notifications.unreadCount}
        onToggleNotifications={() => setNotifOpen((o) => !o)}
      />

      <PortfolioMetricsRow metrics={data.portfolio.metrics} />

      <div className="ceo-office-grid">
        <div className="ceo-office-main">
          <CeoBriefingCard briefing={data.ceo.morningBrief.briefing} />
          <CeoInsightsPanel ceo={data.ceo} />
          <BoardPanel board={data.ceo.board} />
          <BuildQueuePanel build={data.build} />
          <AbsenceTimeline events={data.live.timeline} />
          <HeadquartersPanel data={data.headquarters} />
          <VentureHealthPanel health={data.health} />

          <section className="ceo-portfolio-section" id="portfolio">
            <div className="ceo-section-head">
              <h2>Portfolio</h2>
              <span>{data.executiveVentures.length} startup{data.executiveVentures.length !== 1 ? "s" : ""}</span>
            </div>
            {data.executiveVentures.length === 0 ? (
              <div className="dash-empty glass">
                <h3>Tu venture studio está vacío</h3>
                <p>ForgeOS está listo para construir tu primera empresa.</p>
                <Link href="/" className="btn btn-primary">
                  + Crear Empresa
                </Link>
              </div>
            ) : (
              <div className="ceo-exec-grid">
                {data.executiveVentures.map((v) => (
                  <ExecutiveCard key={v.id} venture={v} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="ceo-office-side">
          <NotificationCenter
            data={data.notifications}
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
          <ActivityFeed
            recentActivity={data.portfolio.recentActivity}
            upcomingActions={data.portfolio.upcomingActions}
          />
        </div>
      </div>
    </div>
  );
}
