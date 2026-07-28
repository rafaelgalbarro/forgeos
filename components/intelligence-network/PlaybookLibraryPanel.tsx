"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import {
  runIntelligenceNetwork,
  createDefaultIntelligenceContext,
  DEMO_DISCLAIMER,
  PRIVACY_DISCLAIMER_ES,
} from "@/lib/intelligence-network";
import type { IntelligenceNetworkSnapshot } from "@/lib/intelligence-network";
import { NetworkInsightsPanel } from "./NetworkInsightsPanel";
import { PrivacyConsentBanner } from "./PrivacyConsentBanner";
import { LoadingState } from "@/components/ui/LoadingState";

export function PlaybookLibraryPanel() {
  const [snapshot, setSnapshot] = useState<IntelligenceNetworkSnapshot | null>(null);

  const refresh = useCallback(() => {
    setSnapshot(runIntelligenceNetwork(createDefaultIntelligenceContext()));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!snapshot) {
    return (
      <Container>
        <LoadingState title="Cargando playbooks…" description={DEMO_DISCLAIMER} />
      </Container>
    );
  }

  return (
    <Container>
      <Stack gap="lg">
        <PrivacyConsentBanner consent={snapshot.consent} onConsentChange={() => refresh()} />
        <header>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Badge variant="accent">Program 9000</Badge>
            <Badge variant="amber">{DEMO_DISCLAIMER}</Badge>
          </div>
          <SectionHeader
            title="Biblioteca de Playbooks"
            subtitle="Catálogo de playbooks agregados de la red — sin datos crudos cross-org"
          />
          <Link href="/network" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            ← Dashboard de red
          </Link>
        </header>

        <p style={{ opacity: 0.85 }}>{PRIVACY_DISCLAIMER_ES}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {snapshot.playbooks.map((pb) => (
            <Card key={pb.id}>
              <Badge variant="default">{pb.category}</Badge>
              <h3 style={{ margin: "0.5rem 0" }}>{pb.title}</h3>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>{pb.summary}</p>
              <ol style={{ fontSize: "0.85rem", paddingLeft: "1.25rem" }}>
                {pb.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <p style={{ fontSize: "0.8rem", marginTop: "0.75rem", opacity: 0.7 }}>
                Adopción en red: {pb.adoptionRatePct}%
              </p>
            </Card>
          ))}
        </div>
      </Stack>
    </Container>
  );
}
