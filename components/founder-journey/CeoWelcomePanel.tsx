"use client";

import Link from "next/link";
import { CeoCard } from "@/components/ui/fhis/CeoCard";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import { Checkbox } from "@/components/ui/fhis/Checkbox";
import type { CeoWelcomeContent } from "@/lib/founder-journey/types";

interface CeoWelcomePanelProps {
  content: CeoWelcomeContent;
  acknowledged?: boolean;
  onAcknowledgeChange?: (value: boolean) => void;
  showCta?: boolean;
}

export function CeoWelcomePanel({
  content,
  acknowledged = false,
  onAcknowledgeChange,
  showCta = true,
}: CeoWelcomePanelProps) {
  return (
    <Stack gap="lg">
      <CeoCard title={content.headline} subtitle={content.summary}>
        <ul className="fhis-onboarding-goals-list">
          {content.priorities.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </CeoCard>

      <Panel>
        <h3>Recomendaciones ejecutivas</h3>
        <ul className="fhis-onboarding-goals-list">
          {content.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Panel>

      {onAcknowledgeChange && (
        <Checkbox
          label="He revisado el briefing del CEO y estoy listo para continuar"
          checked={acknowledged}
          onChange={onAcknowledgeChange}
        />
      )}

      {showCta && (
        <div className="fhis-auth-actions">
          <Link href={content.cta.href}>
            <Button>{content.cta.label} →</Button>
          </Link>
        </div>
      )}
    </Stack>
  );
}
