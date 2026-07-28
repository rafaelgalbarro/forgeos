"use client";

import { useEffect } from "react";
import { DesignPartnerShell } from "@/components/design-partners/DesignPartnerShell";
import { UsageAnalyticsPanel } from "@/components/design-partners/UsageAnalyticsPanel";
import { trackDesignPartnerPageView } from "@/lib/design-partners";
import { readSession } from "@/lib/auth/session-store";

export default function AnalyticsRoute() {
  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/analytics", session?.userId, session?.activeWorkspaceId);
  }, []);

  return (
    <DesignPartnerShell
      title="Analytics de uso"
      description="Eventos de producto, journey y telemetría AI — almacenados en localStorage"
    >
      <UsageAnalyticsPanel />
    </DesignPartnerShell>
  );
}
