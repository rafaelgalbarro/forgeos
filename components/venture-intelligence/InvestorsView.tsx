"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildDemoForgeCapitalClientSnapshot } from "@/lib/forge-capital/client";
import type { ForgeCapitalClientSnapshot } from "@/lib/forge-capital/client";
import { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Progress } from "@/components/ui/fhis/Progress";

export function InvestorsView() {
  const [data, setData] = useState<ForgeCapitalClientSnapshot | null>(null);

  useEffect(() => {
    setData(buildDemoForgeCapitalClientSnapshot());
  }, []);

  if (!data) {
    return (
      <Container>
        <div className="fhis-dashboard-loading">Cargando investor room…</div>
      </Container>
    );
  }

  const { intelligence: snap } = data;
  const room = snap.investorRoom;

  return (
    <Container className="fhis-investors-view">
      <Stack gap="lg">
        <header className="fhis-capital-header">
          <div>
            <p className="fhis-dashboard-kicker">Investor Room · RC8</p>
            <h1 className="fhis-section-header-title">Data Room</h1>
            <p className="fhis-founder-header-sub">{snap.ventureName}</p>
          </div>
          <div className="fhis-founder-header-badges">
            <Badge variant="amber">{HEURISTIC_DISCLAIMER}</Badge>
            <Link href="/capital" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              ← Capital
            </Link>
          </div>
        </header>

        <div className="fhis-capital-kpi-grid">
          <KpiBlock label="Data room readiness" value={`${room.readinessPct}%`} />
          <KpiBlock label="Investor readiness" value={`${snap.investorReadiness.score}%`} />
          <KpiBlock label="Ronda objetivo" value={snap.fundraising.targetRound} />
          <KpiBlock
            label="Importe"
            value={`${snap.fundraising.amountNeededEur.toLocaleString("es-ES")} €`}
          />
        </div>

        <Panel>
          <SectionHeader title="Secciones del data room" subtitle={room.disclaimer} />
          <Progress label="Preparación general" value={room.readinessPct} showValue />
          <ul className="fhis-investor-room-sections">
            {room.sections.map((sec) => (
              <li key={sec.id} className="fhis-investor-room-section">
                <div className="fhis-investor-room-section-head">
                  <strong>{sec.title}</strong>
                  <Badge
                    variant={
                      sec.status === "ready" ? "accent" : sec.status === "partial" ? "amber" : "default"
                    }
                  >
                    {sec.status === "ready" ? "Listo" : sec.status === "partial" ? "Parcial" : "Pendiente"}
                  </Badge>
                </div>
                <ul className="fhis-investor-room-docs">
                  {sec.documents.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Checklist due diligence" />
          <ul className="fhis-capital-dd-list">
            {snap.dueDiligence.map((item) => (
              <li key={item.id} className="fhis-capital-dd-item">
                <span>
                  <Badge variant="default">{item.category}</Badge> {item.label}
                </span>
                <Badge variant={item.priority === "high" ? "red" : "default"}>
                  {item.priority}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Estrategia de salida" subtitle={snap.exitStrategy.disclaimer} />
          <ul className="fhis-exit-scenarios">
            {snap.exitStrategy.scenarios.map((s) => (
              <li key={s.type}>
                <strong>{s.type}</strong> — {s.probability}% · {s.timelineYears}a — {s.notes}
              </li>
            ))}
          </ul>
        </Panel>
      </Stack>
    </Container>
  );
}
