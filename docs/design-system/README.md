# FHIS — Forge Human Interface System

**Release 0.4** — Infraestructura de diseño para ForgeOS.

## Qué es FHIS

FHIS (Forge Human Interface System) es el sistema de diseño unificado de ForgeOS. Proporciona tokens, componentes y patrones visuales para construir interfaces consistentes en toda la plataforma.

## Estructura

```
lib/design-system/          # Tokens TypeScript + cn utility
  tokens/                   # brand, colors, typography, grid, etc.
  css/tokens.css            # CSS custom properties --fhis-*
components/ui/fhis/         # 40 componentes React
styles/fhis/                # CSS de componentes
app/design-system/          # Showcase interactivo
docs/design-system/         # Documentación
```

## Principios

1. **Tokens primero** — Todos los componentes usan variables `--fhis-*`
2. **Sin dependencias nuevas** — Solo `clsx` para className merging
3. **Coexistencia** — FHIS vive en `components/ui/fhis/` sin romper `components/ui/` existente
4. **Infraestructura, no migración** — Preparar el terreno sin reemplazar UI actual

## Quick Start

```tsx
import { Button, Card, PageTemplate } from "@/components/ui/fhis";
import { colors, cn } from "@/lib/design-system";

<PageTemplate title="Mi página">
  <Card padding="md">
    <Button variant="primary">Acción</Button>
  </Card>
</PageTemplate>
```

## Showcase

Visita `/design-system` para ver todos los componentes en acción.

## Documentación

- [brand.md](./brand.md) — Identidad de marca
- [colors.md](./colors.md) — Paleta de colores
- [components.md](./components.md) — Catálogo de componentes
- [usage.md](./usage.md) — Guía de uso
- [best-practices.md](./best-practices.md) — Buenas prácticas
- [do-dont.md](./do-dont.md) — Qué hacer y qué evitar
- [examples.md](./examples.md) — Ejemplos de código
