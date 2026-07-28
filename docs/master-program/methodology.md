# Metodología — Vision → Build

## Jerarquía

```
Vision → Program → Epic → Feature → Release → Build
```

Implementada en `lib/programs/methodology.ts`.

## Niveles

| Nivel | Descripción | Artefacto |
|-------|-------------|-----------|
| **Vision** | Dirección estratégica ForgeOS | `docs/master-program/vision.md` |
| **Program** | Dominio de gobernanza (5 programas) | `ProgramDescriptor` en registry |
| **Epic** | Objetivo medible de programa | `Epic` (scaffold registry) |
| **Feature** | Unidad entregable concreta | `Feature` |
| **Release** | Agrupación versionada de features | `Release` |
| **Build** | Compilación y verificación | `npm run build`, HTTP checks |

## Flujo de trabajo

1. **Definir épica** — objetivo, programa owner, pilares afectados
2. **Descomponer features** — cada una con status y release target
3. **Agrupar release** — version semver o tag interno
4. **Ejecutar build** — sin romper rutas existentes
5. **Informe de delivery** — usar [delivery-template.md](./delivery-template.md)

## Helpers disponibles

```typescript
import {
  createEpic,
  createFeature,
  createRelease,
  createEmptyEpicRegistry,
  describeHierarchy,
} from "@/lib/programs";
```

## Estado actual (2030.0.0)

- `epicRegistry` en cada programa está vacío (scaffold)
- La jerarquía es contrato; el registro de épicas se activará en 2030.1

## Relación con platform roadmap

La metodología de programas es ortogonal al roadmap de pilares (`docs/platform/13_master_roadmap.md`). Un release de programa puede abarcar múltiples pilares.
