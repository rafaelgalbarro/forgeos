# Examples — FHIS

## Dashboard KPI row

```tsx
import { Grid, KpiBlock, Panel } from "@/components/ui/fhis";

<Grid cols={4} gap="md">
  <Panel><KpiBlock label="Ventures" value={12} delta={8} /></Panel>
  <Panel><KpiBlock label="MRR" value="€42.5K" delta={12} /></Panel>
  <Panel><KpiBlock label="Agents" value={6} /></Panel>
  <Panel><KpiBlock label="Builds" value={3} delta={-5} /></Panel>
</Grid>
```

## Formulario de configuración

```tsx
"use client";
import { Stack, Input, Select, Switch, Button } from "@/components/ui/fhis";

<Stack gap="md">
  <Input label="Nombre del venture" placeholder="Mi empresa" />
  <Select label="Sector" options={[
    { value: "fintech", label: "FinTech" },
    { value: "saas", label: "SaaS" },
  ]} />
  <Switch label="Auto-build" checked={auto} onChange={setAuto} />
  <Button variant="primary">Guardar</Button>
</Stack>
```

## Pipeline de ventures

```tsx
import { Pipeline } from "@/components/ui/fhis";

<Pipeline stages={[
  { title: "Ideas", count: 12 },
  { title: "Research", count: 5, active: true },
  { title: "Build", count: 3 },
  { title: "Launch", count: 1 },
]} />
```

## Estado vacío con acción

```tsx
import { EmptyState, Button } from "@/components/ui/fhis";

<EmptyState title="Sin ventures" description="Crea tu primera empresa." icon="◫">
  <Button variant="primary">Crear empresa</Button>
</EmptyState>
```

## Conversación IA

```tsx
import { AiConversation, Panel } from "@/components/ui/fhis";

<Panel>
  <AiConversation messages={[
    { role: "user", content: "Analiza el mercado de pagos B2B" },
    { role: "assistant", content: "El mercado TAM es €12B con CAGR del 18%..." },
  ]} />
</Panel>
```

## Responsive hook

```tsx
"use client";
import { useResponsive } from "@/components/ui/fhis";

function MiComponente() {
  const { bp, isSm } = useResponsive();
  return <p>Breakpoint: {bp}</p>;
}
```
