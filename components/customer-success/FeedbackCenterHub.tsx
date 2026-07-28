"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import {
  listFeedbackInbox,
  getFeedbackInboxCount,
  trackDesignPartnerPageView,
} from "@/lib/customer-success";
import type { FeedbackInboxItem } from "@/lib/design-partners";
import { readSession } from "@/lib/auth/session-store";
import { CustomerSuccessShell } from "./CustomerSuccessShell";
import { IdeasPortalPanel } from "./IdeasPortalPanel";

const SOURCE_LABELS: Record<FeedbackInboxItem["source"], string> = {
  beta: "Beta",
  issue: "Issue",
  feature: "Feature",
  nps: "NPS",
};

export function FeedbackCenterHub() {
  const [inbox, setInbox] = useState<FeedbackInboxItem[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const session = readSession();
    trackDesignPartnerPageView("/feedback-center", session?.userId, session?.activeWorkspaceId);
    setInbox(listFeedbackInbox());
    setCount(getFeedbackInboxCount());
  }, []);

  return (
    <CustomerSuccessShell
      title="Centro de feedback"
      description="Inbox unificado de beta, issues, ideas y NPS — extiende Program 5000"
    >
      <Panel>
        <h3 className="fhis-beta-panel-title">Inbox ({count})</h3>
        {inbox.length === 0 ? (
          <p className="fhis-beta-empty">
            Sin feedback aún. Los design partners pueden enviar desde /feedback o el widget flotante.
          </p>
        ) : (
          inbox.map((item) => (
            <div key={item.id} className="fhis-beta-analytics-row">
              <span>
                <Badge variant="accent">{SOURCE_LABELS[item.source]}</Badge> {item.title}
                <br />
                <small>{item.message.slice(0, 120)}{item.message.length > 120 ? "…" : ""}</small>
              </span>
              <time className="fhis-beta-analytics-time">
                {new Date(item.createdAt).toLocaleString("es-ES")}
              </time>
            </div>
          ))
        )}
      </Panel>

      <IdeasPortalPanel />
    </CustomerSuccessShell>
  );
}
