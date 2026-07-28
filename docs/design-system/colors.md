# Colors — FHIS

## Paleta principal

| Token | CSS Variable | Valor | Uso |
|-------|-------------|-------|-----|
| bg | `--fhis-color-bg` | `#09090b` | Fondo principal |
| bgElevated | `--fhis-color-bg-elevated` | `#0f0f12` | Fondos elevados |
| panel | `--fhis-color-panel` | `#111114` | Paneles y cards |
| text | `--fhis-color-text` | `#fafafa` | Texto principal |
| textMuted | `--fhis-color-text-muted` | `#a1a1aa` | Texto secundario |
| line | `--fhis-color-line` | `#27272a` | Bordes |
| accent | `--fhis-color-accent` | `#a3e635` | Acción primaria |
| blue | `--fhis-color-blue` | `#818cf8` | Info |
| amber | `--fhis-color-amber` | `#fbbf24` | Warning |
| red | `--fhis-color-red` | `#f87171` | Error/Danger |
| green | `--fhis-color-green` | `#4ade80` | Success |

## Uso

```tsx
import { colors } from "@/lib/design-system";

// TypeScript
const accent = colors.accent;
```

```css
/* CSS — SIEMPRE preferir variables */
.mi-elemento {
  background: var(--fhis-color-panel);
  color: var(--fhis-color-text);
  border: 1px solid var(--fhis-color-line);
}
```

## Mapeo con globals.css

Los tokens FHIS mapean 1:1 con las variables existentes en `:root` (`--bg`, `--accent`, etc.) pero con prefijo `--fhis-*` para aislamiento.
