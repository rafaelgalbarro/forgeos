"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { trackDesignPartnerPageView } from "@/lib/design-partners";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { FeedbackForm } from "@/components/beta-platform/FeedbackForm";
import { FeedbackInbox } from "@/components/design-partners/FeedbackInbox";

export function DesignPartnerFeedbackPage() {
  useEffect(() => {
    trackDesignPartnerPageView("/feedback");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-beta-feedback-page">
        <SectionHeader
          title="Feedback Design Partners"
          description="Tu opinión moldea ForgeOS — bugs, ideas, issues y mejoras de UX"
        />

        <div className="fhis-beta-feedback-layout">
          <Stack gap="md">
            <Panel>
              <h2 className="fhis-beta-panel-title">Enviar feedback</h2>
              <FeedbackForm />
            </Panel>
            <Panel>
              <h2 className="fhis-beta-panel-title">Reportar issue</h2>
              <p className="fhis-beta-signup-hint">
                Para issues técnicos detallados, usa el{" "}
                <Link href="/design-partners">dashboard de design partners</Link>.
              </p>
            </Panel>
          </Stack>
          <Stack gap="md">
            <Panel>
              <h2 className="fhis-beta-panel-title">Inbox de feedback</h2>
              <FeedbackInbox />
            </Panel>
            <p className="fhis-beta-signup-hint">
              <Link href="/design-partners">Dashboard DP</Link>
              {" · "}
              <Link href="/roadmap">Roadmap</Link>
              {" · "}
              <Link href="/customer-success">Customer Success</Link>
            </p>
          </Stack>
        </div>
      </Container>
    </div>
  );
}
