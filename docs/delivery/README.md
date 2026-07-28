# ForgeOS Delivery System (2030.1)

Sistema de gobernanza y entrega del Master Program 2030. Vive en `lib/delivery/` y **no** se importa desde `app/` ni `components/`.

## Propósito

- Registrar épicas operativas y asignarlas a uno de los 5 programas
- Dividir épicas en releases incrementales
- Aplicar quality gates obligatorios antes de marcar trabajo como terminado
- Generar informes de entrega (`DeliveryReport`) en markdown

## Estructura

```
lib/delivery/
├── types.ts              # Contratos completos (DeliveryReport, gates, roadmap)
├── epic-registry.ts      # Registro in-memory de épicas
├── release-registry.ts   # Registro in-memory de releases
├── delivery-report.ts    # Crear, validar y exportar informes
├── quality-gates.ts      # Gates obligatorios y helpers CI
├── roadmap-status.ts     # Estado scaffold/conexión de módulos
└── index.ts              # Exportaciones selectivas

docs/delivery/            # Guías operativas
scripts/check-quality-gates.js  # Scan de imports prohibidos en dashboard
```

## Relación con lib/programs/

| Capa | Rol |
|------|-----|
| `lib/programs/` | Arquitectura de programas, descriptors, epic scaffold en descriptors |
| `lib/delivery/` | Gobernanza operativa: épicas/releases de entrega, gates, informes |

`lib/programs/types.ts` conserva un `DeliveryReport` parcial histórico. La versión completa está en `lib/delivery/types.ts`.

## Uso rápido

```typescript
import {
  registerEpic,
  divideEpicIntoReleases,
  createDeliveryReport,
  validateDeliveryReport,
  formatDeliveryReportMarkdown,
  evaluateQualityGates,
  runBuildGate,
  runCriticalRoutesGate,
} from "@/lib/delivery";

// Solo en scripts, CI o documentación — NO en app/components
```

## Documentación

1. [01_epics.md](./01_epics.md) — Crear y asignar épicas
2. [02_release_process.md](./02_release_process.md) — División épica → releases
3. [03_quality_gates.md](./03_quality_gates.md) — Gates obligatorios
4. [04_delivery_reports.md](./04_delivery_reports.md) — Generar informe
5. [05_definition_of_done.md](./05_definition_of_done.md) — Qué significa terminado

Ver también: [docs/master-program/2030_1_delivery_system.md](../master-program/2030_1_delivery_system.md)
