"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import {
  getBetaDashboardData,
  trackBetaEvent,
  installCrashCapture,
  isFeatureEnabled,
} from "@/lib/beta-platform";
import type { BetaDashboardData } from "@/lib/beta-platform";
import { readSession } from "@/lib/auth/session-store";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { WaitlistForm } from "./WaitlistForm";
import { InvitationRedeem } from "./InvitationRedeem";
import { FeatureFlagsPanel } from "./FeatureFlagsPanel";
import { UsageAnalyticsPanel } from "./UsageAnalyticsPanel";
import { CrashReportsPanel } from "./CrashReportsPanel";
import { ChangelogPanel } from "./ChangelogPanel";

const STAGE_LABELS: Record<string, string> = {
  none: "Sin acceso",
  waitlist: "En waitlist",
  invited: "Invitado",
  registered: "Registrado",
  active: "Activo",
};

export function BetaDashboard() {
  const [data, setData] = useState<BetaDashboardData | null>(null);
  const [tab, setTab] = useState<"overview" | "flags" | "analytics" | "crashes" | "changelog">("overview");

  const refresh = useCallback(() => {
    setData(getBetaDashboardData());
  }, []);

  useEffect(() => {
    const session = readSession();
    trackBetaEvent({ event: "beta_dashboard_view", path: "/beta", userId: session?.userId });
    refresh();
    const cleanup = installCrashCapture("/beta", session?.userId);
    return cleanup;
  }, [refresh]);

  const access = data?.access;
  const showAnalytics = isFeatureEnabled("beta-analytics-panel", {
    userId: readSession()?.userId,
    workspaceId: readSession()?.activeWorkspaceId,
  });
  const showCrashes = isFeatureEnabled("crash-reports-admin", {
    userId: readSession()?.userId,
    workspaceId: readSession()?.activeWorkspaceId,
  });

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-beta-dashboard">
        <SectionHeader
          title="Beta Dashboard"
          description="Hub central para usuarios beta — waitlist, invitaciones, flags y analytics"
        />

        <div className="fhis-beta-dashboard-header">
          <Badge variant="accent">Sprint 6 · Private Beta</Badge>
          {access && (
            <Badge variant={access.stage === "active" ? "accent" : "default"}>
              {STAGE_LABELS[access.stage] ?? access.stage}
            </Badge>
          )}
        </div>

        {access && access.stage === "none" && (
          <Grid cols={2} gap="lg" className="fhis-beta-onboarding-grid">
            <Panel>
              <h2 className="fhis-beta-panel-title">1. Únete a la waitlist</h2>
              <WaitlistForm redirectTo="" onJoined={refresh} />
            </Panel>
            <Panel>
              <h2 className="fhis-beta-panel-title">2. Canjea invitación</h2>
              <InvitationRedeem onRedeemed={refresh} />
            </Panel>
          </Grid>
        )}

        {access && access.stage === "waitlist" && (
          <Panel className="fhis-beta-waitlist-banner">
            <p>
              Estás en la waitlist — posición <strong>#{data?.waitlistPosition}</strong>.
              Canjea un código de invitación para continuar.
            </p>
            <InvitationRedeem onRedeemed={refresh} />
          </Panel>
        )}

        {access && access.stage === "invited" && !access.hasAuthSession && (
          <Panel className="fhis-beta-invite-banner">
            <p>Invitación canjeada. Crea tu cuenta para acceder al producto.</p>
            <div className="fhis-beta-invite-actions">
              <Link href="/register" className="fhis-btn fhis-btn-primary fhis-btn-sm">
                Registrarse
              </Link>
              <Link href="/login" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Iniciar sesión
              </Link>
            </div>
          </Panel>
        )}

        {access?.canAccessProduct && (
          <Panel className="fhis-beta-access-banner">
            <p>✓ Acceso beta activo</p>
            <Link href="/os" className="fhis-btn fhis-btn-primary fhis-btn-sm">
              Entrar a ForgeOS →
            </Link>
          </Panel>
        )}

        <div className="fhis-beta-tabs">
          {(["overview", "flags", "analytics", "crashes", "changelog"] as const).map((t) => {
            if (t === "analytics" && !showAnalytics) return null;
            if (t === "crashes" && !showCrashes) return null;
            return (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "primary" : "ghost"}
                onClick={() => setTab(t)}
              >
                {t === "overview" ? "Resumen" : t === "flags" ? "Flags" : t === "analytics" ? "Analytics" : t === "crashes" ? "Crashes" : "Changelog"}
              </Button>
            );
          })}
        </div>

        {data && tab === "overview" && (
          <Grid cols={4} gap="md" className="fhis-beta-kpi-grid">
            <Panel className="fhis-beta-kpi">
              <span className="fhis-beta-stat-value">{data.waitlistPosition ?? "—"}</span>
              <span className="fhis-beta-stat-label">Posición waitlist</span>
            </Panel>
            <Panel className="fhis-beta-kpi">
              <span className="fhis-beta-stat-value">{data.feedbackCount}</span>
              <span className="fhis-beta-stat-label">Feedbacks</span>
            </Panel>
            <Panel className="fhis-beta-kpi">
              <span className="fhis-beta-stat-value">{data.analyticsEventCount}</span>
              <span className="fhis-beta-stat-label">Eventos</span>
            </Panel>
            <Panel className="fhis-beta-kpi">
              <span className="fhis-beta-stat-value">{data.crashReportCount}</span>
              <span className="fhis-beta-stat-label">Crashes</span>
            </Panel>
          </Grid>
        )}

        {data && tab === "flags" && (
          <FeatureFlagsPanel flags={data.featureFlags} onUpdate={refresh} />
        )}

        {data && tab === "analytics" && showAnalytics && (
          <UsageAnalyticsPanel eventCount={data.analyticsEventCount} />
        )}

        {data && tab === "crashes" && showCrashes && (
          <CrashReportsPanel reportCount={data.crashReportCount} />
        )}

        {data && tab === "changelog" && (
          <ChangelogPanel entries={data.recentChangelog} />
        )}

        <div className="fhis-beta-dashboard-footer">
          <Link href="/waitlist">Waitlist</Link>
          <Link href="/feedback">Feedback</Link>
          <Link href="/support">Soporte</Link>
          <Link href="/status">Status</Link>
        </div>
      </Container>
    </div>
  );
}
