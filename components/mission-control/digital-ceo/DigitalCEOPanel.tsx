"use client";

import { useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { ProactiveCEOState } from "@/lib/mission-control/digital-ceo/types";
import { MorningBriefCard } from "./MorningBriefCard";
import { MissionBriefCard } from "./MissionBriefCard";
import { CEOBriefCard } from "./CEOBriefCard";
import { DailyPrioritiesList } from "./DailyPrioritiesList";
import { WeeklyReviewCard } from "./WeeklyReviewCard";
import { ExecutiveDigestCard } from "./ExecutiveDigestCard";

interface Props {
  state: ProactiveCEOState;
}

const TABS = [
  { id: "morning", label: "Morning Brief" },
  { id: "mission", label: "Mission Brief" },
  { id: "ceo", label: "CEO Brief" },
  { id: "priorities", label: "Prioridades" },
  { id: "weekly", label: "Semanal" },
  { id: "digest", label: "Digest" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DigitalCEOPanel({ state }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("morning");
  const briefs = state.briefs;

  if (!briefs) return null;

  return (
    <Panel className="fhis-digital-ceo-panel">
      <Stack gap="md">
        <SectionHeader title="CEO Digital" subtitle="Briefings proactivos" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--fhis-color-border)",
                background: activeTab === tab.id ? "var(--fhis-color-accent)" : "var(--fhis-color-surface)",
                color: activeTab === tab.id ? "#fff" : "inherit",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "morning" && <MorningBriefCard brief={briefs.morningBrief} />}
        {activeTab === "mission" && <MissionBriefCard brief={briefs.missionBrief} />}
        {activeTab === "ceo" && <CEOBriefCard brief={briefs.ceoBrief} />}
        {activeTab === "priorities" && <DailyPrioritiesList priorities={briefs.dailyPriorities} />}
        {activeTab === "weekly" && <WeeklyReviewCard review={briefs.weeklyReview} />}
        {activeTab === "digest" && <ExecutiveDigestCard digest={briefs.executiveDigest} />}
      </Stack>
    </Panel>
  );
}
