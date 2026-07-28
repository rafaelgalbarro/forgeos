"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import type { GTMPackage, GTMDeliverableId } from "@/lib/mission-control/go-to-market/types";
import { GTM_DELIVERABLE_LABELS } from "@/lib/mission-control/go-to-market/types";
import { readGTMPackage } from "@/lib/mission-control/go-to-market";

const LaunchPlanView = dynamic(() => import("./LaunchPlanView").then((m) => m.LaunchPlanView), { ssr: false });
const ContentCalendarView = dynamic(() => import("./ContentCalendarView").then((m) => m.ContentCalendarView), { ssr: false });
const LinkedInPlanView = dynamic(() => import("./LinkedInPlanView").then((m) => m.LinkedInPlanView), { ssr: false });
const EmailCampaignsView = dynamic(() => import("./EmailCampaignsView").then((m) => m.EmailCampaignsView), { ssr: false });
const ProductHuntChecklistView = dynamic(() => import("./ProductHuntChecklistView").then((m) => m.ProductHuntChecklistView), { ssr: false });
const PressKitView = dynamic(() => import("./PressKitView").then((m) => m.PressKitView), { ssr: false });
const WebsiteReviewView = dynamic(() => import("./WebsiteReviewView").then((m) => m.WebsiteReviewView), { ssr: false });
const OnboardingChecklistView = dynamic(() => import("./OnboardingChecklistView").then((m) => m.OnboardingChecklistView), { ssr: false });

const TABS: { id: GTMDeliverableId; label: string }[] = [
  { id: "launchPlan", label: GTM_DELIVERABLE_LABELS.launchPlan },
  { id: "contentCalendar", label: GTM_DELIVERABLE_LABELS.contentCalendar },
  { id: "linkedInPlan", label: GTM_DELIVERABLE_LABELS.linkedInPlan },
  { id: "emailCampaigns", label: GTM_DELIVERABLE_LABELS.emailCampaigns },
  { id: "productHunt", label: GTM_DELIVERABLE_LABELS.productHunt },
  { id: "pressKit", label: GTM_DELIVERABLE_LABELS.pressKit },
  { id: "websiteReview", label: GTM_DELIVERABLE_LABELS.websiteReview },
  { id: "onboardingChecklist", label: GTM_DELIVERABLE_LABELS.onboardingChecklist },
];

interface Props {
  missionId: string;
  generating?: boolean;
  onRegenerate?: () => void;
}

export function GoToMarketPanel({ missionId, generating, onRegenerate }: Props) {
  const [activeTab, setActiveTab] = useState<GTMDeliverableId>("launchPlan");
  const pkg: GTMPackage | null = readGTMPackage(missionId);

  if (!pkg && !generating) {
    return (
      <Panel className="fhis-mc-gtm-panel">
        <Stack gap="md">
          <SectionHeader title="Lanzamiento" subtitle="Go To Market — 8 entregables" />
          <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
            Escribe &quot;lanzar&quot; o &quot;go to market&quot; en la conversación, o avanza a fase VALIDATE/DEPLOY/OPERATE.
          </p>
          {onRegenerate && (
            <Button variant="primary" onClick={onRegenerate}>
              Generar plan GTM
            </Button>
          )}
        </Stack>
      </Panel>
    );
  }

  if (generating) {
    return (
      <Panel className="fhis-mc-gtm-panel">
        <SectionHeader title="Lanzamiento" subtitle="Generando entregables GTM…" />
      </Panel>
    );
  }

  if (!pkg) return null;

  return (
    <Panel className="fhis-mc-gtm-panel">
      <Stack gap="md">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SectionHeader title="Lanzamiento" subtitle={`${pkg.ventureName} — ${pkg.generatedAt.slice(0, 10)}`} />
          {onRegenerate && (
            <Button variant="secondary" onClick={onRegenerate} style={{ fontSize: "0.75rem" }}>
              Regenerar
            </Button>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "4px 10px",
                fontSize: "0.75rem",
                borderRadius: 6,
                border: activeTab === tab.id ? "2px solid var(--fhis-color-accent)" : "1px solid var(--fhis-color-border, #ddd)",
                background: activeTab === tab.id ? "var(--fhis-color-bg-subtle)" : "transparent",
                cursor: "pointer",
              }}
            >
              {tab.label}
              {pkg.deliverableStatus[tab.id] === "ready" && (
                <span style={{ marginLeft: 4 }}> ✓</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "launchPlan" && <LaunchPlanView plan={pkg.launchPlan} />}
        {activeTab === "contentCalendar" && <ContentCalendarView entries={pkg.contentCalendar} />}
        {activeTab === "linkedInPlan" && <LinkedInPlanView posts={pkg.linkedInPlan} />}
        {activeTab === "emailCampaigns" && <EmailCampaignsView campaigns={pkg.emailCampaigns} />}
        {activeTab === "productHunt" && <ProductHuntChecklistView tasks={pkg.productHuntChecklist} />}
        {activeTab === "pressKit" && <PressKitView kit={pkg.pressKit} />}
        {activeTab === "websiteReview" && <WebsiteReviewView items={pkg.websiteReview} />}
        {activeTab === "onboardingChecklist" && <OnboardingChecklistView tasks={pkg.onboardingChecklist} />}
      </Stack>
    </Panel>
  );
}
