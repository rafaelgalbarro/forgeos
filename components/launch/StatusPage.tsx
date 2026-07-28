"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { STATUS_SERVICES, CHANGELOG, PUBLIC_ROADMAP } from "@/lib/launch";
import { trackPageView } from "@/lib/launch/analytics-hooks";
import { trackBetaPageView } from "@/lib/beta-platform";
import { isLaunchMode, FORGEOS_LAUNCH_VERSION } from "@/lib/forgeos-launch";
import { getStripeMode } from "@/lib/commercial";
import { BETA_CHANGELOG } from "@/lib/beta-platform/changelog";
import { LaunchNav } from "./LaunchNav";
import { FeedbackWidget } from "./FeedbackWidget";
import type { StatusService } from "@/lib/launch/types";

const STATUS_VARIANT: Record<StatusService["status"], "accent" | "amber" | "default" | "red"> = {
  operational: "accent",
  degraded: "amber",
  maintenance: "default",
  outage: "red",
};

const STATUS_LABEL: Record<StatusService["status"], string> = {
  operational: "Operativo",
  degraded: "Degradado",
  maintenance: "Mantenimiento",
  outage: "Caído",
};

export function StatusPage() {
  useEffect(() => {
    trackPageView("/status");
    trackBetaPageView("/status");
  }, []);

  const allOperational = STATUS_SERVICES.every((s) => s.status === "operational");

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-status-page">
        <SectionHeader
          title="Estado del sistema"
          description={`Estado en tiempo real de los servicios ForgeOS — ${FORGEOS_LAUNCH_VERSION}`}
        />

        <p className="fhis-beta-status-hint">
          Program 7000 · Launch {isLaunchMode() ? "activo" : "inactivo"} · Billing {getStripeMode()} · Beta {BETA_CHANGELOG[0].version}
        </p>

        <Panel className={`fhis-status-banner${allOperational ? " fhis-status-banner-ok" : ""}`}>
          <span className="fhis-status-banner-dot" />
          {allOperational
            ? "Todos los sistemas operativos"
            : "Algunos servicios con incidencias menores"}
        </Panel>

        <Stack gap="md">
          {STATUS_SERVICES.map((service) => (
            <Panel key={service.id} className="fhis-status-service">
              <div className="fhis-status-service-head">
                <strong>{service.name}</strong>
                <Badge variant={STATUS_VARIANT[service.status]}>
                  {STATUS_LABEL[service.status]}
                </Badge>
              </div>
              <p>{service.description}</p>
            </Panel>
          ))}
          <Panel className="fhis-status-service">
            <div className="fhis-status-service-head">
              <strong>Launch Hub (Program 7000)</strong>
              <Badge variant="accent">Operativo</Badge>
            </div>
            <p>Superficies públicas: /launch, /demo, /community, /changelog.</p>
          </Panel>
          <Panel className="fhis-status-service">
            <div className="fhis-status-service-head">
              <strong>Commercial Billing</strong>
              <Badge variant="accent">Operativo ({getStripeMode()})</Badge>
            </div>
            <p>Portal de facturación, suscripciones y API keys — Program 6000.</p>
          </Panel>
        </Stack>

        <section className="fhis-status-section">
          <h2>Incidentes recientes</h2>
          <Panel>
            <p className="fhis-status-no-incidents">Sin incidentes reportados en las últimas 30 días.</p>
          </Panel>
        </section>

        <section className="fhis-status-section">
          <h2>Roadmap</h2>
          <ul className="fhis-status-roadmap">
            {PUBLIC_ROADMAP.filter((i) => i.status !== "shipped").map((item) => (
              <li key={item.id}>
                <Badge variant="default">{item.quarter}</Badge> {item.title}
              </li>
            ))}
          </ul>
        </section>

        <p className="fhis-status-footer">
          <Link href="/support">Reportar problema →</Link>
          {" · "}
          Última versión: {CHANGELOG[0].version}
        </p>
      </Container>
    </div>
  );
}
