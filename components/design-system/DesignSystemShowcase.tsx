"use client";

import { useState } from "react";
import { cn } from "@/lib/design-system/cn";
import {
  BrandDisplay,
  TokenColors,
  TokenTypography,
  TokenGrid,
  TokenSpacing,
  TokenRadius,
  TokenElevation,
  TokenShadows,
  TokenBlur,
  TokenGlow,
  TokenMotion,
  Button,
  Input,
  Select,
  Checkbox,
  Radio,
  Switch,
  Card,
  ExecutiveCard,
  CeoCard,
  AiConversation,
  WorkerCard,
  VentureCard,
  SimulatorCard,
  Timeline,
  Pipeline,
  Badge,
  Status,
  Notification,
  Dialog,
  Tooltip,
  EmptyState,
  Skeleton,
  Progress,
  ChartsContainer,
  KpiBlock,
  Stack,
  Grid,
  Panel,
  SectionHeader,
  PageTemplate,
  Responsive,
  useResponsive,
} from "@/components/ui/fhis";

const SECTIONS = [
  { id: "brand", label: "Marca" },
  { id: "tokens", label: "Tokens" },
  { id: "buttons", label: "Botones" },
  { id: "forms", label: "Formularios" },
  { id: "cards", label: "Tarjetas" },
  { id: "domain", label: "Dominio" },
  { id: "data", label: "Datos" },
  { id: "feedback", label: "Feedback" },
  { id: "layout", label: "Layout" },
  { id: "templates", label: "Plantillas" },
] as const;

export function DesignSystemShowcase() {
  const [activeSection, setActiveSection] = useState("brand");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radioVal, setRadioVal] = useState("a");
  const [switchOn, setSwitchOn] = useState(false);
  const { bp } = useResponsive();

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <PageTemplate
      title="FHIS Design System"
      subtitle="Forge Human Interface System — Release 0.4"
    >
      <div className="fhis-showcase">
        <nav className="fhis-showcase-nav" aria-label="Secciones del design system">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                "fhis-showcase-nav-link",
                activeSection === s.id && "fhis-showcase-nav-link-active"
              )}
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div>
          {/* 1. Brand */}
          <section id="brand" className="fhis-showcase-section">
            <SectionHeader title="Marca" description="Identidad visual ForgeOS / FHIS" />
            <div className="fhis-showcase-demo">
              <BrandDisplay showSystem />
            </div>
          </section>

          {/* 2-11. Tokens */}
          <section id="tokens" className="fhis-showcase-section">
            <SectionHeader title="Tokens CSS" description="Consumidores de variables --fhis-*" />
            <div className="fhis-showcase-demo fhis-showcase-row">
              <TokenColors><span>Colors</span></TokenColors>
              <TokenTypography><span>Typography</span></TokenTypography>
              <TokenRadius><span>Radius</span></TokenRadius>
              <TokenSpacing><span>Spacing</span></TokenSpacing>
              <TokenElevation><span>Elevation</span></TokenElevation>
              <TokenShadows><span>Shadows</span></TokenShadows>
              <TokenBlur><span>Blur</span></TokenBlur>
              <TokenGlow><span>Glow</span></TokenGlow>
              <TokenMotion><span>Motion</span></TokenMotion>
            </div>
            <div className="fhis-showcase-demo" style={{ marginTop: 12 }}>
              <TokenGrid>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ padding: 8, background: "var(--fhis-color-panel-hover)", borderRadius: 6, textAlign: "center", fontSize: 12 }}>
                    Col {i + 1}
                  </div>
                ))}
              </TokenGrid>
            </div>
          </section>

          {/* 12. Buttons */}
          <section id="buttons" className="fhis-showcase-section">
            <SectionHeader title="Botones" description="Variantes y tamaños" />
            <div className="fhis-showcase-demo fhis-showcase-row">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" size="sm">SM</Button>
              <Button variant="primary" size="lg">LG</Button>
              <Button variant="primary" loading>Loading</Button>
            </div>
          </section>

          {/* 13-17. Forms */}
          <section id="forms" className="fhis-showcase-section">
            <SectionHeader title="Formularios" description="Input, Select, Checkbox, Radio, Switch" />
            <div className="fhis-showcase-demo">
              <Stack gap="md">
                <Input label="Nombre" placeholder="Escribe aquí…" hint="Campo de texto" />
                <Select label="Departamento" options={[
                  { value: "ceo", label: "CEO Office" },
                  { value: "product", label: "Producto" },
                  { value: "tech", label: "Tecnología" },
                ]} />
                <Checkbox label="Acepto términos" checked={checked} onChange={setChecked} />
                <Stack gap="sm">
                  <Radio name="demo" value="a" label="Opción A" checked={radioVal === "a"} onChange={setRadioVal} />
                  <Radio name="demo" value="b" label="Opción B" checked={radioVal === "b"} onChange={setRadioVal} />
                </Stack>
                <Switch label="Modo oscuro" checked={switchOn} onChange={setSwitchOn} />
              </Stack>
            </div>
          </section>

          {/* 18-24. Cards */}
          <section id="cards" className="fhis-showcase-section">
            <SectionHeader title="Tarjetas" description="Card, Executive, CEO, Worker, Venture, Simulator" />
            <Grid cols={2} gap="md">
              <Card variant="elevated" padding="md">
                <strong>Card base</strong>
                <p style={{ margin: "8px 0 0", color: "var(--fhis-color-text-muted)", fontSize: 14 }}>Contenido genérico</p>
              </Card>
              <ExecutiveCard name="Ana García" role="Chief Product Officer">
                Lidera la estrategia de producto y roadmap.
              </ExecutiveCard>
              <CeoCard title="CEO AI" subtitle="ForgeOS Intelligence">
                Analizando oportunidades de mercado y priorizando ventures.
              </CeoCard>
              <WorkerCard name="Research Agent" role="Investigación de mercado" icon="🔍" status="active" />
              <VentureCard title="FinTech SaaS" description="Plataforma de pagos B2B" tags={["SaaS", "FinTech"]} />
              <SimulatorCard title="MRR Proyectado" value="€42.5K" delta={12.3} />
            </Grid>
          </section>

          {/* 21, 25-28. Domain */}
          <section id="domain" className="fhis-showcase-section">
            <SectionHeader title="Componentes de dominio" description="Conversación IA, Timeline, Pipeline, Badges, Status" />
            <Grid cols={2} gap="md">
              <Panel>
                <AiConversation messages={[
                  { role: "user", content: "¿Cuál es el estado del venture FinTech?" },
                  { role: "assistant", content: "El venture está en fase de validación. MRR proyectado: €42.5K con crecimiento del 12%." },
                ]} />
              </Panel>
              <Timeline items={[
                { title: "Idea registrada", time: "Hace 2 días", description: "Concepto inicial validado" },
                { title: "Research completado", time: "Hace 1 día" },
                { title: "Build en progreso", time: "Ahora", description: "Generando MVP" },
              ]} />
            </Grid>
            <div className="fhis-showcase-demo" style={{ marginTop: 16 }}>
              <Pipeline stages={[
                { title: "Ideas", count: 12 },
                { title: "Research", count: 5, active: true },
                { title: "Build", count: 3 },
                { title: "Launch", count: 1 },
              ]} />
            </div>
            <div className="fhis-showcase-demo fhis-showcase-row" style={{ marginTop: 16 }}>
              <Badge>Default</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="blue">Blue</Badge>
              <Badge variant="amber">Amber</Badge>
              <Badge variant="red">Red</Badge>
              <Status status="active" />
              <Status status="pending" />
              <Status status="success" />
              <Status status="error" />
            </div>
          </section>

          {/* 34-36. Data */}
          <section id="data" className="fhis-showcase-section">
            <SectionHeader title="Datos y métricas" description="Progress, Charts, KPI" />
            <Grid cols={3} gap="md">
              <Panel>
                <Progress value={72} label="Progreso del build" showValue />
              </Panel>
              <ChartsContainer title="Ingresos semanales" />
              <KpiBlock label="Ventures activos" value={7} delta={16} />
            </Grid>
          </section>

          {/* 29-33. Feedback */}
          <section id="feedback" className="fhis-showcase-section">
            <SectionHeader title="Feedback" description="Notificaciones, Dialog, Tooltip, Empty, Skeleton" />
            <Stack gap="md">
              <Notification title="Nuevo venture creado" body="FinTech SaaS ha sido registrado correctamente." />
              <Notification title="Atención requerida" body="El agente de research necesita input." variant="warning" />
              <div className="fhis-showcase-row">
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>Abrir Dialog</Button>
                <Tooltip content="Información adicional">
                  <Button variant="ghost">Hover me</Button>
                </Tooltip>
              </div>
              <Grid cols={2} gap="md">
                <EmptyState title="Sin ventures" description="Crea tu primera empresa para comenzar." icon="◫" />
                <Panel>
                  <Skeleton variant="title" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="card" />
                </Panel>
              </Grid>
            </Stack>
            <Dialog open={dialogOpen} title="Confirmar acción" onClose={() => setDialogOpen(false)} onConfirm={() => setDialogOpen(false)}>
              ¿Deseas continuar con esta operación?
            </Dialog>
          </section>

          {/* 37. Layout */}
          <section id="layout" className="fhis-showcase-section">
            <SectionHeader title="Layout" description="Stack, Grid, Panel, Responsive" />
            <Panel>
              <p style={{ margin: 0, fontSize: 14, color: "var(--fhis-color-text-muted)" }}>
                Breakpoint actual: <strong>{bp}</strong>
              </p>
              <Responsive hideBelow="sm">
                <p style={{ fontSize: 13, marginTop: 8 }}>Visible en pantallas ≥ md</p>
              </Responsive>
            </Panel>
          </section>

          {/* 38-39. Templates */}
          <section id="templates" className="fhis-showcase-section">
            <SectionHeader title="Plantillas" description="SectionHeader y PageTemplate en uso" />
            <p style={{ color: "var(--fhis-color-text-muted)", fontSize: 14 }}>
              Esta página usa PageTemplate y SectionHeader como estructura base del showcase.
            </p>
          </section>
        </div>
      </div>
    </PageTemplate>
  );
}
