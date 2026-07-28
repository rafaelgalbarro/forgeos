# Components — FHIS

## Catálogo (40 sistemas)

### Sistema y Tokens (1-11)

| # | Componente | Descripción |
|---|-----------|-------------|
| 1 | `BrandDisplay` | Helper de marca |
| 2 | `TokenColors` | Consumidor CSS de colores |
| 3 | `TokenTypography` | Consumidor CSS de tipografía |
| 4 | `TokenGrid` | Consumidor CSS de grid |
| 5 | `TokenSpacing` | Consumidor CSS de spacing |
| 6 | `TokenRadius` | Consumidor CSS de radius |
| 7 | `TokenElevation` | Consumidor CSS de elevation |
| 8 | `TokenShadows` | Consumidor CSS de sombras |
| 9 | `TokenBlur` | Consumidor CSS de blur |
| 10 | `TokenGlow` | Consumidor CSS de glow |
| 11 | `TokenMotion` | Consumidor CSS de motion |

### Form Controls (12-17)

| # | Componente | Variantes |
|---|-----------|-----------|
| 12 | `Button` | primary, secondary, ghost, danger × sm, md, lg |
| 13 | `Input` | label, hint, error |
| 14 | `Select` | options array |
| 15 | `Checkbox` | controlled |
| 16 | `Radio` | group by name |
| 17 | `Switch` | toggle |

### Cards (18-24)

| # | Componente | Contexto |
|---|-----------|----------|
| 18 | `Card` | Genérico |
| 19 | `ExecutiveCard` | FHIS genérico (no CEO Office) |
| 20 | `CeoCard` | CEO AI |
| 21 | `AiConversation` | Chat IA |
| 22 | `WorkerCard` | Agentes/workers |
| 23 | `VentureCard` | Ventures/empresas |
| 24 | `SimulatorCard` | Métricas simuladas |

### Data & Status (25-36)

| # | Componente | Uso |
|---|-----------|-----|
| 25 | `Timeline` | Eventos cronológicos |
| 26 | `Pipeline` | Etapas de flujo |
| 27 | `Badge` | Etiquetas |
| 28 | `Status` | Indicadores de estado |
| 29 | `Notification` | Alertas |
| 30 | `Dialog` | Modal |
| 31 | `Tooltip` | Info hover |
| 32 | `EmptyState` | Sin datos |
| 33 | `Skeleton` | Loading placeholder |
| 34 | `Progress` | Barra de progreso |
| 35 | `ChartsContainer` | Contenedor de gráficos |
| 36 | `KpiBlock` | Bloque KPI |

### Layout & Templates (37-40)

| # | Componente | Descripción |
|---|-----------|-------------|
| 37 | `Stack`, `Grid`, `Container`, `Panel` | Layout containers |
| 38 | `SectionHeader` | Encabezado de sección |
| 39 | `PageTemplate` | Plantilla de página |
| 40 | `Responsive`, `useResponsive` | Utilidades responsive |

## Importación

```tsx
// Componentes individuales (recomendado)
import { Button } from "@/components/ui/fhis/Button";

// Barrel de componentes FHIS
import { Button, Card } from "@/components/ui/fhis";

// Tokens (sin componentes)
import { colors, cn } from "@/lib/design-system";
```
