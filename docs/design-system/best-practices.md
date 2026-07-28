# Best Practices — FHIS

## Tokens

1. **Una fuente de verdad** — Modificar tokens en `lib/design-system/tokens/` y `lib/design-system/css/tokens.css`
2. **CSS vars en componentes** — Nunca hardcodear colores en `components.css`
3. **TypeScript para lógica** — Usar `colors.accent` solo cuando necesites valores en JS

## Componentes

1. **Import directo** — Preferir `@/components/ui/fhis/Button` sobre barrel cuando sea posible
2. **No mezclar sistemas** — No combinar clases FHIS con clases legacy (`ui-metric-card`, `btn-primary`) en el mismo elemento
3. **Props sobre CSS** — Usar variantes de componente (`variant="primary"`) en lugar de clases custom

## Arquitectura

1. **FHIS es paralelo** — No reemplazar `components/ui/ExecutiveCard` (CEO Office) con `components/ui/fhis/ExecutiveCard`
2. **Sin dynamic imports** — Importar componentes estáticamente
3. **Sin barrel pesado** — `lib/design-system/index.ts` exporta solo tokens + cn

## Accesibilidad

1. Usar `label` en inputs y form controls
2. `Dialog` incluye `role="dialog"` y `aria-modal`
3. `Switch` incluye `role="switch"` y `aria-checked`

## Performance

1. CSS global ligero (~15KB) cargado una vez en layout
2. Componentes sin dependencias externas
3. Server Components por defecto
