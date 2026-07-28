# Do / Don't — FHIS

## ✅ Do

- Usar `--fhis-*` CSS variables en estilos custom
- Importar desde `@/components/ui/fhis/` para nuevas UIs
- Usar `PageTemplate` + `SectionHeader` para páginas nuevas
- Extender con `className` cuando sea necesario
- Consultar `/design-system` como referencia visual
- Mantener tokens sincronizados entre TS y CSS

## ❌ Don't

- No modificar `components/ui/ActionButton`, `MetricCard`, etc.
- No cambiar rutas existentes (`/dashboard`, `/venture/*`)
- No añadir dependencias npm (Tailwind, shadcn, etc.)
- No hardcodear `#a3e635` — usar `var(--fhis-color-accent)`
- No crear barrel files que importen todos los componentes en `lib/`
- No usar dynamic imports (`import()`)
- No migrar páginas existentes a FHIS en esta release
- No modificar lógica de negocio en `lib/fos`, `lib/ceo`, `lib/board`
- No reemplazar `globals.css` — FHIS es aditivo

## Migración futura

Cuando se migre una página existente:

1. Identificar componentes legacy usados
2. Mapear a equivalente FHIS
3. Reemplazar clase por clase
4. Verificar visualmente contra showcase
5. No mezclar ambos sistemas en la misma vista
