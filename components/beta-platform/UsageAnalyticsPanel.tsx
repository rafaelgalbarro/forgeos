"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { listAnalyticsEvents } from "@/lib/beta-platform";
import type { BetaAnalyticsEventRecord } from "@/lib/beta-platform";

interface UsageAnalyticsPanelProps {
  eventCount: number;
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Vista de página",
  waitlist_join: "Waitlist",
  invitation_redeem: "Invitación",
  beta_dashboard_view: "Dashboard",
  feature_flag_toggle: "Feature flag",
  feedback_submit: "Feedback",
  crash_report: "Crash",
  beta_register: "Registro",
  cta_click: "CTA",
};

export function UsageAnalyticsPanel({ eventCount }: UsageAnalyticsPanelProps) {
  const events: BetaAnalyticsEventRecord[] =
    typeof window !== "undefined" ? listAnalyticsEvents().slice(-10).reverse() : [];

  return (
    <Stack gap="md">
      <Panel className="fhis-beta-analytics-summary">
        <span className="fhis-beta-stat-value">{eventCount}</span>
        <span className="fhis-beta-stat-label">eventos registrados (localStorage)</span>
      </Panel>
      <div className="fhis-beta-analytics-list">
        {events.length === 0 ? (
          <p className="fhis-beta-empty">Sin eventos aún. Navega por la plataforma beta.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="fhis-beta-analytics-row">
              <Badge variant="default">{EVENT_LABELS[ev.event] ?? ev.event}</Badge>
              <span className="fhis-beta-analytics-path">{ev.path ?? ev.label ?? "—"}</span>
              <time className="fhis-beta-analytics-time">
                {new Date(ev.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
          ))
        )}
      </div>
    </Stack>
  );
}
