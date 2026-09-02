"use client";

import Link from "next/link";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { Card } from "@/components/ui/fhis/Card";
import { Badge } from "@/components/ui/fhis/Badge";
import { InvestmentHomeCard } from "@/components/investment/InvestmentHomeCard";

export function CeoWidget() {
  return (
    <Card className="fhis-os-widget fhis-os-widget-ceo">
      <div className="fhis-os-widget-head">
        <h3>CEO</h3>
        <Badge variant="accent">Activo</Badge>
      </div>
      <p>Director General monitorizando el portfolio.</p>
      <Link href="/os/ceo">Abrir CEO →</Link>
    </Card>
  );
}

export function InvestmentWidget() {
  return <InvestmentHomeCard />;
}

export function TasksWidget() {
  return (
    <Card className="fhis-os-widget">
      <h3>Tasks</h3>
      <ul className="fhis-os-widget-list">
        <li>Revisar prioridades del día</li>
        <li>Aprobar siguiente build VANDL</li>
        <li>Reunión CEO 15 min</li>
      </ul>
    </Card>
  );
}

export function BuildWidget() {
  return (
    <Card className="fhis-os-widget">
      <h3>Build</h3>
      <p>Frontend factory — último artefacto listo.</p>
      <Link href="/os/build">Ver Build →</Link>
    </Card>
  );
}

export function PortfolioWidget() {
  return (
    <Card className="fhis-os-widget">
      <h3>Portfolio</h3>
      <p>1 venture activo — VANDL</p>
      <Link href="/os/portfolio">Portfolio →</Link>
    </Card>
  );
}

export function TimelineWidget() {
  return (
    <Card className="fhis-os-widget">
      <h3>Timeline</h3>
      <p>Últimos eventos del venture.</p>
      <Link href={`/venture/${VANDL_VENTURE_ID}/timeline`}>Timeline →</Link>
    </Card>
  );
}

export function CalendarWidget() {
  return (
    <Card className="fhis-os-widget">
      <h3>Calendar</h3>
      <p>Revisión semanal — viernes 10:00</p>
      <Link href="/os/calendar">Calendario →</Link>
    </Card>
  );
}
