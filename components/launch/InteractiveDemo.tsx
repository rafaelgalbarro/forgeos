"use client";

import Link from "next/link";
import { Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { getDemoModeConfig, listDemoScenarios } from "@/lib/forgeos-launch";
import { ProductTour } from "./ProductTour";
import { VideoTutorialsPanel } from "./VideoTutorialsPanel";
import { PublicApiDocsPanel } from "./PublicApiDocsPanel";

export function InteractiveDemo() {
  const config = getDemoModeConfig();
  const scenarios = listDemoScenarios();

  return (
    <Stack gap="lg">
      <Panel className="fhis-demo-banner">
        <Badge variant="accent">{config.id}</Badge>
        <h2>{config.title}</h2>
        <p>{config.description}</p>
        {config.dryRun && <Badge variant="default">Dry-run · sin registro</Badge>}
      </Panel>

      <ProductTour />

      <SectionHeader
        title="Escenarios de demo"
        description="Explora áreas clave de ForgeOS en modo exploración"
      />
      <Grid cols={2} gap="md">
        {scenarios.map((scenario) => (
          <Panel key={scenario.id} className="fhis-demo-scenario">
            <h3>{scenario.title}</h3>
            <p>{scenario.description}</p>
            <Link href={scenario.href} className="fhis-btn fhis-btn-primary fhis-btn-sm">
              {scenario.cta}
            </Link>
          </Panel>
        ))}
      </Grid>

      <VideoTutorialsPanel />
      <PublicApiDocsPanel />
    </Stack>
  );
}
