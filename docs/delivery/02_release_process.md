# Proceso de releases — épica → releases

## Principio

Una épica grande se divide en **releases incrementales** para mantener build verde y entregas revisables.

Jerarquía: `Program → Epic → Release → Feature → Build`

## Cuándo dividir

- La épica toca más de un área de `lib/`
- Hay dependencias entre fases (scaffold antes de wiring)
- Se quiere validar gates por tramo

## Pasos

### 1. Verificar épica registrada

```typescript
import { getEpic } from "@/lib/delivery";

const epic = getEpic("2030-1-delivery-system");
if (!epic) throw new Error("Registrar épica primero");
```

### 2. Definir specs de release

```typescript
import { divideEpicIntoReleases } from "@/lib/delivery";

const releases = divideEpicIntoReleases("2030-1-delivery-system", [
  {
    id: "2030-1-r1-types",
    version: "2030.1.1",
    title: "Delivery types + registries",
    featureIds: [],
  },
  {
    id: "2030-1-r2-gates",
    version: "2030.1.2",
    title: "Quality gates + docs",
    targetDate: "2026-07-02",
  },
]);
```

### 3. Vincular features (opcional)

```typescript
import { linkFeaturesToRelease } from "@/lib/delivery";

linkFeaturesToRelease("2030-1-r2-gates", ["feat-quality-gates", "feat-delivery-docs"]);
```

### 4. Estados de release

| Status | Significado |
|--------|-------------|
| `planned` | Definido, sin implementar |
| `in_progress` | En desarrollo |
| `released` | Gates pasados + informe generado |
| `cancelled` | Descartado con motivo documentado |

### 5. Por release: gates + informe

Cada release completado debe:

1. Pasar todos los quality gates obligatorios
2. Tener un `DeliveryReport` con campo `release` relleno
3. Actualizar status a `released` con `releasedAt`

## Reglas

- `programId` del release debe coincidir con el de la épica
- No conectar módulos scaffold (`connected: false`) en un release sin épica/release documentados
- Un release no debe romper rutas críticas existentes

## Ejemplo de división típica

| Release | Contenido |
|---------|-----------|
| R1 | Types, registries, docs base |
| R2 | Gates, scripts CI, plantillas |
| R3 | (futuro) Wiring controlado si la épica lo exige |

Para épicas solo lib/docs (como 2030.1), **no hay wiring** — releases son organizacionales.
