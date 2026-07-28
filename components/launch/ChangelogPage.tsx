"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { CHANGELOG } from "@/lib/launch/changelog";
import { trackPageView } from "@/lib/launch/analytics-hooks";
import { LaunchNav } from "./LaunchNav";
import { FeedbackWidget } from "./FeedbackWidget";
import type { ChangelogEntry } from "@/lib/launch/types";

const TAG_VARIANT: Record<ChangelogEntry["tag"], "accent" | "default" | "amber"> = {
  major: "accent",
  minor: "default",
  patch: "amber",
};

export function ChangelogPage() {
  useEffect(() => {
    trackPageView("/changelog");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-changelog-page">
        <SectionHeader
          title="Changelog"
          description="Historial de versiones y novedades de ForgeOS"
        />

        <Stack gap="lg">
          {CHANGELOG.map((entry) => (
            <Panel key={entry.version} className="fhis-changelog-entry">
              <div className="fhis-changelog-entry-header">
                <Badge variant={TAG_VARIANT[entry.tag]}>{entry.tag}</Badge>
                <h3>{entry.version}</h3>
                <span className="fhis-changelog-date">{entry.date}</span>
              </div>
              <h4>{entry.title}</h4>
              <ul>
                {entry.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </Panel>
          ))}
        </Stack>

        <Link href="/launch" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
          ← Volver al Launch Hub
        </Link>
      </Container>
    </div>
  );
}
