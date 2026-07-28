"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Button } from "@/components/ui/fhis/Button";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import type { WelcomeDashboardData } from "@/lib/founder-journey/types";
import { getPostWorkspaceRoute } from "@/lib/founder-journey/journey-manager";

interface WelcomeDashboardProps {
  data: WelcomeDashboardData;
  showOsCta?: boolean;
}

export function WelcomeDashboard({ data, showOsCta = true }: WelcomeDashboardProps) {
  const router = useRouter();

  return (
    <Stack gap="lg">
      <SectionHeader title={data.greeting} description={data.subtitle} />

      <div className="fhis-kpi-row" style={{ display: "flex", gap: "var(--fhis-space-4)", flexWrap: "wrap" }}>
        {data.stats.map((s) => (
          <KpiBlock key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      <Panel>
        <h3>Siguiente paso</h3>
        <p>{data.nextAction.description}</p>
        <div className="fhis-auth-actions" style={{ marginTop: "var(--fhis-space-4)" }}>
          <Button onClick={() => router.push(data.nextAction.href)}>
            {data.nextAction.label} →
          </Button>
          {showOsCta && (
            <Button variant="ghost" onClick={() => router.push(getPostWorkspaceRoute())}>
              Abrir ForgeOS
            </Button>
          )}
        </div>
      </Panel>

      <Panel>
        <h3>Accesos rápidos</h3>
        <ul className="fhis-ws-list">
          {data.quickLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </Panel>
    </Stack>
  );
}
