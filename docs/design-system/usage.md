# Usage — FHIS

## Instalación

FHIS ya está integrado en ForgeOS v0.4. Los estilos se cargan en `app/layout.tsx`:

```tsx
import "@/styles/fhis/tokens.css";
import "@/styles/fhis/components.css";
```

## Crear una página

```tsx
import { PageTemplate, SectionHeader, Grid, Card, Button } from "@/components/ui/fhis";

export default function MiPagina() {
  return (
    <PageTemplate title="Mi Página" subtitle="Descripción">
      <SectionHeader title="Sección" description="Detalle" />
      <Grid cols={2} gap="md">
        <Card padding="md">Contenido</Card>
        <Card padding="md">
          <Button variant="primary">Acción</Button>
        </Card>
      </Grid>
    </PageTemplate>
  );
}
```

## className extension

Todos los componentes aceptan `className`:

```tsx
<Button className="mi-clase-extra" variant="primary">OK</Button>
```

## cn utility

```tsx
import { cn } from "@/lib/design-system";

<div className={cn("fhis-card", isActive && "fhis-card-elevated")} />
```

## Client vs Server

- Componentes interactivos (`Checkbox`, `Radio`, `Switch`, `Dialog`, `Responsive`) usan `"use client"`
- Componentes estáticos son Server Components por defecto

## CSS personalizado

Siempre usar variables `--fhis-*`:

```css
.mi-componente {
  padding: var(--fhis-space-4);
  border-radius: var(--fhis-radius-md);
  color: var(--fhis-color-text);
}
```
