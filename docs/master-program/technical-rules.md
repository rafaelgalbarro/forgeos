# Reglas técnicas — Master Program 2030

## Arquitectura de capas

```
app/                    # UI — NO importa lib/programs
components/             # UI — NO importa lib/programs
lib/programs/           # Gobernanza (esta capa)
lib/platform/           # 9 pilares
lib/*                   # Módulos existentes (sin mover)
```

## Reglas de importación

| Desde | Puede importar |
|-------|----------------|
| `lib/programs/index.ts` | Todo en programs + `@/lib/platform` (solo bootstrap) |
| `lib/programs/venture-*/` | `../shared`, `@/lib/platform/shared` |
| `lib/programs/venture-*/` | **NO** otros `venture-*/` |
| `app/`, `components/` | **NO** `lib/programs` |

## Prohibiciones

- ❌ Nuevas dependencias npm
- ❌ Dynamic imports
- ❌ Heavy barrels (re-export masivo)
- ❌ Mover código existente
- ❌ Cambiar rutas de app
- ❌ Conectar FOS/CEO/Board/Build Engine a UI en esta versión

## Patrones obligatorios

- **Reference paths only** — `modules.ts` usa strings, no imports de `lib/discovery` etc.
- **Registry idempotente** — `registerProgram` puede llamarse múltiples veces
- **ProgramEngine** — cada programa expone `getDescriptor()` y `getCapabilities()`

## Tipos clave

Definidos en `lib/programs/types.ts`:

- `ProgramId`, `ProgramDescriptor`, `ProgramEngine`
- `Epic`, `Feature`, `Release`, `EpicRegistry`
- `DeliveryReport` — plantilla de informes

## Bootstrap

```typescript
import { bootstrapProgramsRegistry } from "@/lib/programs";

const programs = bootstrapProgramsRegistry();
// También registra pilares platform
```

## Respetar módulos existentes

- `lib/intelligence-layer/`
- `lib/design-system/`
- Adapters en `lib/platform/*/adapters/`

No modificar su comportamiento al añadir la capa de programas.
