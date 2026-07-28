"use client";

import Link from "next/link";
import { Grid, Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { listCaseStudies } from "@/lib/forgeos-launch";

export function CaseStudiesPanel() {
  const studies = listCaseStudies();

  return (
    <>
      <SectionHeader
        title="Casos de éxito"
        description="Historias genéricas de fundadores y equipos usando ForgeOS"
      />
      <Grid cols={3} gap="md">
        {studies.map((study) => (
          <Panel key={study.id} className="fhis-case-study-card">
            <Badge variant="default">{study.industry}</Badge>
            {study.generic && <Badge variant="accent">Caso genérico</Badge>}
            <h3>{study.title}</h3>
            <p>{study.summary}</p>
            <ul className="fhis-launch-beta-perks">
              {study.outcomes.map((o) => (
                <li key={o}>✓ {o}</li>
              ))}
            </ul>
            {study.href && (
              <Link href={study.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Saber más →
              </Link>
            )}
          </Panel>
        ))}
      </Grid>
    </>
  );
}
