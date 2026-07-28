"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Container,
  Panel,
  Stack,
  Grid,
  SectionHeader,
  Badge,
  Progress,
  KpiBlock,
  Notification,
  Button,
} from "@/components/ui/fhis";
import {
  runProductionReadinessEngine,
  PRODUCTION_READINESS_VERSION,
  acknowledgeAlert,
} from "@/lib/production-readiness";
import type { HealthStatus, ProductionHealthCenterSnapshot } from "@/lib/production-readiness";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

function statusVariant(status: HealthStatus): "default" | "accent" | "amber" | "red" {
  switch (status) {
    case "healthy":
      return "accent";
    case "degraded":
      return "amber";
    case "critical":
    case "offline":
      return "red";
    default:
      return "default";
  }
}

function statusLabel(status: HealthStatus): string {
  const map: Record<HealthStatus, string> = {
    healthy: "Saludable",
    degraded: "Degradado",
    critical: "Crítico",
    unknown: "Desconocido",
    offline: "Offline",
  };
  return map[status];
}

interface Props {
  showLabLink?: boolean;
}

export function ProductionHealthCenter({ showLabLink = false }: Props) {
  const [snapshot, setSnapshot] = useState<ProductionHealthCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await runProductionReadinessEngine();
    setSnapshot(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !snapshot) {
    return (
      <Container>
        <LoadingState title="Cargando Production Health Center…" description="Agregando motores de observabilidad" />
      </Container>
    );
  }

  if (!snapshot) {
    return (
      <Container>
        <ErrorState title="Production Health no disponible" description="No se pudo cargar el centro de salud.">
          <Button onClick={() => void refresh()}>Reintentar</Button>
        </ErrorState>
      </Container>
    );
  }

  const checklistPass = snapshot.checklist.filter((c) => c.status === "pass").length;
  const checklistTotal = snapshot.checklist.length;

  return (
    <Container className="fhis-prod-dashboard">
      <Stack gap="lg">
        <Notification
          variant="info"
          title={PRODUCTION_READINESS_VERSION}
          body="Centro de salud de producción — observación vía APIs públicas, sin modificar Runtime ni AI Runtime."
        />

        <header className="fhis-prod-header">
          <div className="fhis-prod-badges">
            <Badge variant={statusVariant(snapshot.overallStatus)}>
              {statusLabel(snapshot.overallStatus)}
            </Badge>
            <Badge variant="default">{snapshot.config.environment}</Badge>
            {snapshot.config.dryRun && <Badge variant="amber">Dry-run</Badge>}
            {snapshot.killSwitch.enabled && <Badge variant="red">Kill Switch</Badge>}
            {showLabLink && (
              <Link href="/lab/production-readiness" className="fhis-prod-lab-link">
                Abrir Lab →
              </Link>
            )}
          </div>
        </header>

        <Grid cols={4} gap="md" className="fhis-prod-kpi-grid">
          <KpiBlock label="Sistema" value={statusLabel(snapshot.system.status)} />
          <KpiBlock label="Runtime" value={`${snapshot.runtime.score}%`} />
          <KpiBlock label="AI" value={`${snapshot.ai.providersHealthy}/${snapshot.ai.providersTotal}`} />
          <KpiBlock label="Checklist" value={`${checklistPass}/${checklistTotal}`} />
        </Grid>

        <Grid cols={2} gap="md">
          <Panel className="fhis-prod-panel">
            <SectionHeader title="Alertas activas" subtitle={`${snapshot.alerts.length} sin reconocer`} />
            {snapshot.alerts.length === 0 ? (
              <p className="fhis-prod-text">Sin alertas activas.</p>
            ) : (
              <ul className="fhis-prod-list">
                {snapshot.alerts.slice(0, 5).map((a) => (
                  <li key={a.id} className="fhis-prod-alert-row">
                    <Badge variant={a.severity === "critical" ? "red" : a.severity === "warning" ? "amber" : "default"}>
                      {a.severity}
                    </Badge>
                    <span>{a.title}</span>
                    <Button size="sm" variant="ghost" onClick={() => { acknowledgeAlert(a.id); void refresh(); }}>
                      OK
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/alerts" className="fhis-prod-link">Ver todas →</Link>
          </Panel>

          <Panel className="fhis-prod-panel">
            <SectionHeader title="Gates de despliegue" subtitle={snapshot.deploymentGates.filter((g) => g.blocking && g.status === "fail").length > 0 ? "Bloqueos detectados" : "Listo para preview"} />
            <ul className="fhis-prod-list">
              {snapshot.deploymentGates.map((g) => (
                <li key={g.id} className="fhis-prod-gate-row">
                  <Badge variant={g.status === "pass" ? "accent" : g.status === "fail" ? "red" : "amber"}>
                    {g.status}
                  </Badge>
                  <span>{g.label}</span>
                  {g.message && <span className="fhis-prod-muted">{g.message}</span>}
                </li>
              ))}
            </ul>
          </Panel>
        </Grid>

        <Panel className="fhis-prod-panel">
          <SectionHeader title="Health checks" subtitle="Agregados de sistema, runtime, AI y config" />
          <div className="fhis-prod-check-grid">
            {snapshot.healthChecks.map((c) => (
              <div key={c.id} className="fhis-prod-check-card">
                <Badge variant={statusVariant(c.status)}>{c.category}</Badge>
                <strong>{c.label}</strong>
                {c.message && <span className="fhis-prod-muted">{c.message}</span>}
              </div>
            ))}
          </div>
        </Panel>

        <div className="fhis-prod-quick-actions">
          <Link href="/monitoring" className="fhis-prod-qa fhis-prod-qa-primary">Monitoreo</Link>
          <Link href="/incidents" className="fhis-prod-qa fhis-prod-qa-secondary">Incidentes</Link>
          <Link href="/recovery" className="fhis-prod-qa fhis-prod-qa-secondary">Recuperación</Link>
          <Link href="/releases" className="fhis-prod-qa fhis-prod-qa-secondary">Releases</Link>
          <Link href="/health" className="fhis-prod-qa fhis-prod-qa-secondary">Salud</Link>
          <Button variant="ghost" onClick={() => void refresh()}>Actualizar</Button>
        </div>

        <Progress value={checklistPass} max={checklistTotal} label="Checklist de producción" />
      </Stack>
    </Container>
  );
}
