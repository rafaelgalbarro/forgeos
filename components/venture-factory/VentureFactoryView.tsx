"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Status } from "@/components/ui/fhis/Status";
import { Progress } from "@/components/ui/fhis/Progress";
import { Pipeline } from "@/components/ui/fhis/Pipeline";
import { Card } from "@/components/ui/fhis/Card";
import {
  VentureFactoryEngine,
  createInitialVentureFactoryState,
  isVentureFactoryCommand,
  type VentureFactoryState,
} from "@/lib/venture-factory";

interface Props {
  showLabLink?: boolean;
}

const DEMO_IDEA = "Crea una empresa de gafas premium";

export function VentureFactoryView({ showLabLink = false }: Props) {
  const engineRef = useRef<VentureFactoryEngine | null>(null);
  const [state, setState] = useState<VentureFactoryState>(createInitialVentureFactoryState);
  const [command, setCommand] = useState(DEMO_IDEA);

  useEffect(() => {
    const engine = new VentureFactoryEngine();
    engine.onUpdate((_event, next) => setState({ ...next }));
    engineRef.current = engine;
    return () => engine.cancel();
  }, []);

  const running = state.status === "running";
  const valid = isVentureFactoryCommand(command);
  const output = state.output;

  const handleSubmit = useCallback(async () => {
    if (!valid || running) return;
    await engineRef.current?.run(command.trim());
  }, [command, valid, running]);

  const handleCancel = useCallback(() => {
    engineRef.current?.cancel();
  }, []);

  const pipelineStages = state.stages.map((s) => ({
    title: s.label,
    count: state.timeline.filter((e) => e.stageId === s.id && e.status === "done").length > 0 ? 1 : 0,
    active: state.currentStageId === s.id,
  }));

  return (
    <Container className="fhis-venture-factory">
      <Stack gap="lg">
        <header className="fhis-venture-factory-header">
          <div className="fhis-venture-factory-badges">
            <Badge variant="accent">RC7</Badge>
            <Badge variant="default">Venture Factory</Badge>
            <Badge variant="default">Dry-run</Badge>
            <Status
              status={running ? "active" : state.status === "completed" ? "success" : "pending"}
              label={state.status}
            />
          </div>
          <SectionHeader
            title="Venture Factory"
            subtitle="De idea a empresa completa — mercado, producto, arquitectura, lanzamiento y revenue"
          />
          {showLabLink && (
            <Link href="/lab/venture-factory" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Lab harness →
            </Link>
          )}
        </header>

        <Panel>
          <div className="fhis-venture-factory-input">
            <input
              className="fhis-input"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder='Ej: "Crea una empresa de gafas premium"'
              disabled={running}
              aria-label="Idea de venture"
            />
            <Button onClick={handleSubmit} loading={running} disabled={!valid}>
              {running ? "Generando empresa…" : "Crear empresa"}
            </Button>
            {running && (
              <Button variant="ghost" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>
          <Progress value={state.progress} showValue label="Progreso pipeline" />
        </Panel>

        <Panel>
          <SectionHeader title="Pipeline" subtitle="18 etapas — simulación cliente" />
          <Pipeline stages={pipelineStages} />
        </Panel>

        {state.resultSummary && (
          <Panel>
            <Status status="success" label="Resultado" />
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>{state.resultSummary}</p>
          </Panel>
        )}

        {output && (
          <div className="fhis-venture-factory-grid">
            <Card className="fhis-venture-factory-card">
              <h3>Empresa</h3>
              <p><strong>{output.companyName}</strong></p>
              <p className="fhis-venture-muted">{output.valueProposition}</p>
              <Badge variant="accent">Health {output.health.overall}/100</Badge>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Mercado</h3>
              <p>TAM: {output.market.tam}</p>
              <p>SAM: {output.market.sam}</p>
              <p>SOM: {output.market.som}</p>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Competidores</h3>
              <ul>
                {output.competitors.map((c) => (
                  <li key={c.name}>{c.name} — {c.priceRange}</li>
                ))}
              </ul>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Pricing</h3>
              <p>{output.pricing.strategy}</p>
              <ul>
                {output.pricing.plans.map((p) => (
                  <li key={p.name}>{p.name}: {p.price}</li>
                ))}
              </ul>
            </Card>

            <Card className="fhis-venture-factory-card fhis-venture-factory-card-wide">
              <h3>Landing (preview)</h3>
              <p><strong>{output.landing.headline}</strong></p>
              <p>{output.landing.subheadline}</p>
              <ul>
                {output.landing.heroBullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <Button variant="secondary" size="sm">{output.landing.cta}</Button>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>PRD</h3>
              <p>{output.prd.vision}</p>
              <p><strong>MVP:</strong></p>
              <ul>
                {output.prd.mvpFeatures.slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Arquitectura</h3>
              <p>{output.architecture.diagram}</p>
              <p><strong>Stack:</strong> {output.architecture.stack.join(", ")}</p>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Build plan</h3>
              <p><strong>Frontend:</strong> {output.softwarePlan.frontend.pages.join(", ")}</p>
              <p><strong>Backend:</strong> {output.softwarePlan.backend.routes.join(", ")}</p>
              <p><strong>DB:</strong> {output.softwarePlan.database.tables.join(", ")}</p>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Deployment preview</h3>
              <p>{output.deployment.provider}</p>
              <ul>
                {output.deployment.steps.slice(0, 4).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Marketing</h3>
              <p><strong>Canales:</strong> {output.marketing.channels.join(", ")}</p>
              <p><strong>Lanzamiento:</strong></p>
              <ul>
                {output.marketing.launchWeek.slice(0, 3).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Sprint 1</h3>
              <ul>
                {output.prd.sprint1.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Card>

            <Card className="fhis-venture-factory-card">
              <h3>Revenue dashboard</h3>
              <p>{output.revenue.arrProjection}</p>
              <ul>
                {output.revenue.kpis.map((k) => (
                  <li key={k.label}>{k.label}: {k.value} ({k.trend})</li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {state.timeline.length > 0 && (
          <Panel>
            <SectionHeader title="Timeline" subtitle="Etapas ejecutadas" />
            <ul className="fhis-venture-timeline">
              {state.timeline.map((e) => (
                <li key={e.id} className={e.status === "active" ? "active" : ""}>
                  <Badge variant={e.status === "done" ? "accent" : "default"}>{e.label}</Badge>
                  <span>{e.message}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
