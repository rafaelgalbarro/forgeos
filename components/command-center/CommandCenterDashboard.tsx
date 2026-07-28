"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container, Stack, Grid, Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Notification } from "@/components/ui/fhis/Notification";
import { Button } from "@/components/ui/fhis/Button";
import { COMMAND_CENTER_VERSION } from "@/lib/command-center/types";
import type { CommandCenterSnapshot } from "@/lib/command-center/types";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { ErrorState } from "@/components/ui/ErrorState";
interface Props {
  showLabLink?: boolean;
  initialSnapshot: CommandCenterSnapshot;
}

export function CommandCenterDashboard({ showLabLink = false, initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(initialSnapshot);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    ensureVandlSeeded();
    const { runCommandCenterEngine } = await import("@/lib/command-center/command-center-engine");
    const data = await runCommandCenterEngine();
    setSnapshot(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  if (!snapshot) {
    return (
      <Container>
        <ErrorState title="Command Center no disponible" description="No se pudo componer el snapshot del centro de mando.">
          <Button onClick={() => void refresh()}>Reintentar</Button>
        </ErrorState>
      </Container>
    );
  }

  const { ceo } = snapshot;

  return (
    <Container className="fhis-cc-dashboard">
      <Stack gap="lg">
        <Notification
          variant="info"
          title={COMMAND_CENTER_VERSION}
          body="Centro de mando del fundador — todos los motores conectados vía APIs públicas."
        />

        <header className="fhis-cc-header">
          <div className="fhis-cc-badges">
            <Badge variant="accent">Command Center</Badge>
            <Badge variant="default">{snapshot.founderName}</Badge>
            {showLabLink && (
              <Link href="/lab/command-center" className="fhis-cc-lab-link">
                Abrir Lab →
              </Link>
            )}
          </div>
        </header>

        <Panel className="fhis-cc-ceo-panel">
          <SectionHeader title="CEO Briefing" subtitle={ceo.greeting} />
          <p className="fhis-cc-text">{ceo.executiveSummary}</p>
          <Grid cols={4} gap="md">
            <KpiBlock label="Confidence" value={`${ceo.confidenceScore}%`} />
            <KpiBlock label="Ventures" value={snapshot.ventures.ventures.length} />
            <KpiBlock label="Runtime" value={`${snapshot.runtime.score}%`} />
            <KpiBlock label="Org Health" value={snapshot.organization.healthScore} />
          </Grid>
          <Grid cols={2} gap="lg">
            <div>
              <strong>Objetivos del día</strong>
              <ul className="fhis-cc-list">
                {ceo.dailyGoals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Riesgos</strong>
              <ul className="fhis-cc-list">
                {ceo.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </Grid>
          <p>
            <Link href={ceo.ctaHref}>{ceo.ctaLabel} →</Link>
          </p>
        </Panel>

        <Grid cols={2} gap="lg">
          <Panel>
            <SectionHeader title="Prioridades de hoy" />
            <ul className="fhis-cc-list">
              {snapshot.priorities.map((p) => (
                <li key={p.id}>
                  <Link href={p.href}>{p.label}</Link>{" "}
                  <Badge variant="amber">{p.priority}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <SectionHeader title="Acciones rápidas" />
            <div className="fhis-cc-quick-actions">
              {snapshot.quickActions.map((a) => (
                <Link key={a.id} href={a.href} className={`fhis-cc-qa fhis-cc-qa-${a.variant ?? "secondary"}`}>
                  {a.label}
                </Link>
              ))}
            </div>
          </Panel>
        </Grid>

        <Panel>
          <SectionHeader title="Ventures" subtitle={`${snapshot.ventures.ventures.length} activas`} />
          {snapshot.ventures.ventures.length === 0 ? (
            <p>{snapshot.ventures.emptyMessage}</p>
          ) : (
            <div className="fhis-cc-venture-grid">
              {snapshot.ventures.ventures.map((v) => (
                <Link key={v.id} href={v.href} className="fhis-cc-venture-card">
                  <strong>{v.name}</strong>
                  <span>Health: {v.healthLabel}</span>
                  <span>Score: {v.ventureScore}</span>
                  <span>Readiness: {v.readinessLabel}</span>
                  <span>Build: {v.buildStatus} · Deploy: {v.deployStatus}</span>
                  <small>{v.lastActivity}</small>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Grid cols={3} gap="md">
          <Panel>
            <SectionHeader title="Executive Mesh" />
            <p>{snapshot.mesh.lastTopic}</p>
            <Badge variant={snapshot.mesh.status === "healthy" ? "accent" : "amber"}>
              {snapshot.mesh.departmentsActive}/{snapshot.mesh.departmentsTotal} deptos
            </Badge>
            <p>
              <Link href={snapshot.mesh.href}>Ver Mesh →</Link>
            </p>
          </Panel>
          <Panel>
            <SectionHeader title="AI Providers" />
            <Badge variant={snapshot.ai.mode === "real" ? "accent" : "default"}>{snapshot.ai.mode}</Badge>
            <p>Latencia media: {snapshot.ai.avgLatencyMs}ms · Coste: ${snapshot.ai.totalCost.toFixed(2)}</p>
            <ul className="fhis-cc-list-compact">
              {snapshot.ai.providers.slice(0, 4).map((p) => (
                <li key={p.id}>
                  {p.label}: {p.healthy ? "OK" : "—"} · {p.latencyMs}ms
                </li>
              ))}
            </ul>
            <Link href={snapshot.ai.href}>Control Center →</Link>
          </Panel>
          <Panel>
            <SectionHeader title="Runtime Health" />
            <Progress value={snapshot.runtime.score} label={snapshot.runtime.label} />
            <p>
              {snapshot.runtime.venturesHealthy}/{snapshot.runtime.venturesTotal} ventures sanas
            </p>
          </Panel>
        </Grid>

        <Grid cols={2} gap="lg">
          <Panel>
            <SectionHeader title="Build Pipeline" />
            <p>Último: {snapshot.build.lastBuildLabel}</p>
            <p>Preview: {snapshot.build.deployPreview}</p>
            <p>Rollback: {snapshot.build.rollbackReady ? "Listo" : "No"}</p>
            <p>Aprobación: {snapshot.build.approvalRequired ? "Requerida" : "No"}</p>
            <Link href={snapshot.build.href}>Deployments →</Link>
          </Panel>
          <Panel>
            <SectionHeader title="Self Evolution" />
            <p>{snapshot.selfEvolution.improvementsDetected} mejoras detectadas</p>
            <ul className="fhis-cc-list-compact">
              {snapshot.selfEvolution.proposals.map((p) => (
                <li key={p.id}>
                  {p.title} — ROI {p.roi} · {p.risk}
                </li>
              ))}
            </ul>
            <Link href={snapshot.selfEvolution.href}>Abrir →</Link>
          </Panel>
        </Grid>

        <Grid cols={3} gap="md">
          <Panel>
            <SectionHeader title="Organization" />
            <KpiBlock label="Health" value={snapshot.organization.healthScore} />
            <p>{snapshot.organization.initiatives} iniciativas · {snapshot.organization.departments} deptos</p>
            <Link href={snapshot.organization.href}>Organización →</Link>
          </Panel>
          <Panel>
            <SectionHeader title="Marketplace" />
            <p>{snapshot.marketplace.summary}</p>
            <Link href={snapshot.marketplace.href}>Marketplace →</Link>
          </Panel>
          <Panel>
            <SectionHeader title="Capital" />
            <ul className="fhis-cc-list-compact">
              {snapshot.capital.metrics.slice(0, 3).map((m) => (
                <li key={m.label}>
                  {m.label}: {m.value}
                </li>
              ))}
            </ul>
            <Link href={snapshot.capital.href}>Capital →</Link>
          </Panel>
        </Grid>

        <Grid cols={2} gap="lg">
          <Panel>
            <SectionHeader title="Timeline" />
            <ul className="fhis-cc-list">
              {snapshot.timeline.map((t) => (
                <li key={t.id}>
                  {t.href ? <Link href={t.href}>{t.label}</Link> : t.label}
                  {t.ventureName && ` · ${t.ventureName}`} — {t.relative}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <SectionHeader title="Notificaciones" />
            <ul className="fhis-cc-list">
              {snapshot.notifications.map((n) => (
                <li key={n.id}>
                  <strong>{n.title}</strong> — {n.body}
                </li>
              ))}
            </ul>
          </Panel>
        </Grid>

        <Grid cols={2} gap="lg">
          <Panel>
            <SectionHeader title="Decisiones recientes" />
            <ul className="fhis-cc-list">
              {snapshot.decisions.map((d) => (
                <li key={d.id}>
                  {d.label} <small>({d.department})</small>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <SectionHeader title="Calendario ejecutivo" />
            <ul className="fhis-cc-list">
              {snapshot.calendar.map((c) => (
                <li key={c.id}>
                  {c.title} — {c.time}
                </li>
              ))}
            </ul>
          </Panel>
        </Grid>

        <Panel>
          <SectionHeader title="Tareas" />
          <ul className="fhis-cc-list">
            {snapshot.tasks.map((t) => (
              <li key={t.id}>
                <Link href={t.href}>{t.label}</Link> <Badge>{t.priority}</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="fhis-cc-actions">
          <Button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar Command Center"}
          </Button>
        </div>
      </Stack>
    </Container>
  );
}
