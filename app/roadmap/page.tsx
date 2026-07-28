"use client";

import { useEffect } from "react";
import { DesignPartnerShell } from "@/components/design-partners/DesignPartnerShell";
import { RoadmapVotingPanel } from "@/components/design-partners/RoadmapVotingPanel";
import { trackDesignPartnerPageView } from "@/lib/design-partners";
import { readSession } from "@/lib/auth/session-store";

export default function RoadmapRoute() {
  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/roadmap", session?.userId, session?.activeWorkspaceId);
  }, []);

  return (
    <DesignPartnerShell
      title="Roadmap y votación"
      description="Prioriza features del roadmap público con votos de design partners"
    >
      <RoadmapVotingPanel />
    </DesignPartnerShell>
  );
}
