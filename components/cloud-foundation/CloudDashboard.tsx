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
  KpiBlock,
  Notification,
  Button,
} from "@/components/ui/fhis";
import {
  runCloudFoundationEngine,
  CLOUD_FOUNDATION_VERSION,
  getRollbackReadinessLabel,
  getSecretsSummary,
  getCloudflareReadinessSummary,
  getSupabasePersistenceNote,
} from "@/lib/cloud-foundation";
import type { CloudDashboardSnapshot, CloudHealthStatus } from "@/lib/cloud-foundation";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

function statusVariant(status: CloudHealthStatus): "default" | "accent" | "amber" | "red" {
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

function statusLabel(status: CloudHealthStatus): string {
  const map: Record<CloudHealthStatus, string> = {
    healthy: "Saludable",
    degraded: "Degradado",
    critical: "Crítico",
    unknown: "Desconocido",
    offline: "Offline",
  };
  return map[status];
}

function deployStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    building: "Construyendo",
    ready: "Listo",
    deployed: "Desplegado",
    failed: "Fallido",
    rolled_back: "Revertido",
  };
  return map[status] ?? status;
}

interface Props {
  showLabLink?: boolean;
}

export function CloudDashboard({ showLabLink = false }: Props) {
  const [snapshot, setSnapshot] = useState<CloudDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await runCloudFoundationEngine();
      setSnapshot(data);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !snapshot) {
    return (
      <Container>
        <LoadingState
          title="Cargando Cloud Foundation…"
          description="Agregando estrategia cloud, despliegues y salud"
        />
      </Container>
    );
  }

  if (!snapshot) {
    return (
      <Container>
        <ErrorState title="Cloud Foundation no disponible" description="No se pudo cargar el dashboard.">
          <Button onClick={() => void refresh()}>Reintentar</Button>
        </ErrorState>
      </Container>
    );
  }

  const secretsSummary = getSecretsSummary();

  return (
    <Container className="fhis-cloud-dashboard">
      <Stack gap="lg">
        <Notification
          variant="info"
          title={CLOUD_FOUNDATION_VERSION}
          body="Fundación cloud — preparación únicamente. Sin despliegue a producción. Integrado con build-pipeline y production-readiness."
        />

        <header className="fhis-cloud-header">
          <div className="fhis-cloud-badges">
            <Badge variant={statusVariant(snapshot.health.overallStatus)}>
              {statusLabel(snapshot.health.overallStatus)}
            </Badge>
            <Badge variant="default">{snapshot.config.activeEnvironment}</Badge>
            {snapshot.config.dryRun && <Badge variant="amber">Dry-run</Badge>}
            {snapshot.config.productionBlocked && <Badge variant="red">Producción bloqueada</Badge>}
            {showLabLink && (
              <Link href="/lab/cloud-foundation" className="fhis-cloud-lab-link">
                Abrir Lab →
              </Link>
            )}
          </div>
        </header>

        <Grid cols={4} gap="md" className="fhis-cloud-kpi-grid">
          <KpiBlock label="Salud cloud" value={`${snapshot.health.productionReadinessScore}%`} />
          <KpiBlock label="Despliegue" value={deployStatusLabel(snapshot.deployment.status)} />
          <KpiBlock label="Secretos" value={`${secretsSummary.present}/${secretsSummary.total}`} />
          <KpiBlock label="Releases" value={String(snapshot.releases.length)} />
        </Grid>

        <Grid cols={2} gap="md">
          <Panel className="fhis-cloud-panel">
            <SectionHeader title="Estado de despliegue" subtitle="Build Pipeline (read-only)" />
            <ul className="fhis-cloud-list">
              <li>
                <span className="fhis-cloud-muted">Pipeline:</span>{" "}
                {snapshot.deployment.pipelineId ?? "—"}
              </li>
              <li>
                <span className="fhis-cloud-muted">Modo:</span> {snapshot.deployment.mode}
              </li>
              <li>
                <span className="fhis-cloud-muted">Etapas:</span>{" "}
                {snapshot.deployment.stagesCompleted}/{snapshot.deployment.stagesTotal}
              </li>
              {snapshot.deployment.previewUrl && (
                <li>
                  <span className="fhis-cloud-muted">Preview:</span>{" "}
                  {snapshot.deployment.previewUrl}
                </li>
              )}
            </ul>
            <SectionHeader title="Proveedores" subtitle="Conexiones" />
            <ul className="fhis-cloud-list">
              {snapshot.deployment.providers.map((p) => (
                <li key={p.provider} className="fhis-cloud-provider-row">
                  <Badge variant={statusVariant(p.status)}>{p.provider}</Badge>
                  <span>{p.message}</span>
                </li>
              ))}
            </ul>
            <Link href="/deployments" className="fhis-cloud-link">
              Ver pipeline completo →
            </Link>
          </Panel>

          <Panel className="fhis-cloud-panel">
            <SectionHeader
              title="Rollback"
              subtitle={getRollbackReadinessLabel(snapshot.rollback.ready)}
            />
            <Badge variant={snapshot.rollback.ready ? "accent" : "amber"}>
              {snapshot.rollback.wiredToBuildPipeline ? "Conectado a build-pipeline" : "Stub"}
            </Badge>
            <p className="fhis-cloud-text">{snapshot.rollback.summary}</p>
            <ol className="fhis-cloud-steps">
              {snapshot.rollback.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <p className="fhis-cloud-muted">
              Tiempo estimado: {snapshot.rollback.estimatedMinutes} min
            </p>
          </Panel>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel className="fhis-cloud-panel">
            <SectionHeader title="Estrategia GitHub" subtitle={`Rama default: ${snapshot.github.defaultBranch}`} />
            <ul className="fhis-cloud-list">
              {snapshot.github.branches.map((b) => (
                <li key={b.pattern} className="fhis-cloud-branch-row">
                  <Badge variant={b.protected ? "accent" : "default"}>{b.pattern}</Badge>
                  <span>{b.description}</span>
                  {b.deployTarget && (
                    <Badge variant="default">{b.deployTarget}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="fhis-cloud-panel">
            <SectionHeader title="Vercel" subtitle={snapshot.vercel.projectName} />
            <ul className="fhis-cloud-list">
              {snapshot.vercel.environments.map((e) => (
                <li key={e.environment} className="fhis-cloud-env-row">
                  <Badge variant="default">{e.environment}</Badge>
                  <span>{e.branch}</span>
                  <span className="fhis-cloud-muted">{e.domain}</span>
                  {e.autoDeploy && <Badge variant="accent">auto</Badge>}
                </li>
              ))}
            </ul>
          </Panel>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel className="fhis-cloud-panel">
            <SectionHeader title="Cloudflare" subtitle={getCloudflareReadinessSummary()} />
            <p className="fhis-cloud-text">Zona: {snapshot.cloudflare.zoneName}</p>
            <SectionHeader title="DNS" subtitle={`${snapshot.cloudflare.dnsRecords.length} registros`} />
            <ul className="fhis-cloud-list">
              {snapshot.cloudflare.dnsRecords.map((r, i) => (
                <li key={i}>
                  <Badge variant="default">{r.type}</Badge> {r.name} → {r.content}
                </li>
              ))}
            </ul>
            <SectionHeader title="WAF" subtitle={`${snapshot.cloudflare.wafRules.filter((w) => w.enabled).length} activas`} />
          </Panel>

          <Panel className="fhis-cloud-panel">
            <SectionHeader title="Supabase" subtitle={getSupabasePersistenceNote()} />
            <ul className="fhis-cloud-list">
              {snapshot.supabase.environments.map((e) => (
                <li key={e.id} className="fhis-cloud-env-row">
                  <Badge variant={e.id === snapshot.supabase.activeEnvironment ? "accent" : "default"}>
                    {e.id}
                  </Badge>
                  <span>{e.projectRef}</span>
                  <span className="fhis-cloud-muted">{e.migrationsApplied} migraciones</span>
                </li>
              ))}
            </ul>
          </Panel>
        </Grid>

        <Panel className="fhis-cloud-panel">
          <SectionHeader title="Historial de releases" subtitle={`${snapshot.releases.length} entradas`} />
          <ul className="fhis-cloud-list">
            {snapshot.releases.slice(0, 5).map((r) => (
              <li key={r.id} className="fhis-cloud-release-row">
                <Badge variant={r.status === "deployed" ? "accent" : r.status === "failed" ? "red" : "amber"}>
                  {r.version}
                </Badge>
                <span>{r.environment}</span>
                <span className="fhis-cloud-muted">{r.branch}</span>
                <span className="fhis-cloud-muted">
                  {new Date(r.deployedAt).toLocaleDateString("es-ES")}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/releases" className="fhis-cloud-link">
            Ver releases →
          </Link>
        </Panel>

        <Panel className="fhis-cloud-panel">
          <SectionHeader title="Health checks" subtitle={`${snapshot.health.checks.length} comprobaciones`} />
          <Grid cols={2} gap="sm">
            {snapshot.health.checks.map((c) => (
              <div key={c.id} className="fhis-cloud-check-row">
                <Badge variant={statusVariant(c.status)}>{c.provider}</Badge>
                <span>{c.label}</span>
                {c.message && <span className="fhis-cloud-muted">{c.message}</span>}
              </div>
            ))}
          </Grid>
          <Link href="/production" className="fhis-cloud-link">
            Production Health Center →
          </Link>
        </Panel>

        <Panel className="fhis-cloud-panel">
          <SectionHeader
            title="Secretos"
            subtitle={`${secretsSummary.present} presentes · ${secretsSummary.requiredMissing} requeridos faltantes`}
          />
          <ul className="fhis-cloud-list">
            {snapshot.secrets.slice(0, 8).map((s) => (
              <li key={s.id} className="fhis-cloud-secret-row">
                <Badge variant={s.present ? "accent" : s.required ? "red" : "default"}>
                  {s.present ? "✓" : "—"}
                </Badge>
                <span>{s.key}</span>
                <span className="fhis-cloud-muted">{s.category}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </Stack>
    </Container>
  );
}
