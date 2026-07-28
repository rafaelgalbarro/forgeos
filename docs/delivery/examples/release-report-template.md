# Informe de entrega — [Nombre de la épica]

**Fecha:** YYYY-MM-DD  
**Autor:** [Nombre o equipo]  
**Release:** [versión, ej. 2030.1.0]

---

## Programa

_[Uno de: Venture Core, Venture Execution, Venture Intelligence, Venture Platform, Venture Ecosystem]_

ProgramId: `venture-core` | `venture-execution` | `venture-intelligence` | `venture-platform` | `venture-ecosystem`

---

## Épica

_ID y título de la épica (ej. 2030-1-delivery-system — Program Governance & Delivery System)_

---

## Release

_Versión y título del release dentro de la épica_

---

## Objetivo

_Descripción clara del objetivo de esta entrega en una o dos frases._

---

## Alcance

- Item incluido 1
- Item incluido 2
- `lib/...`
- `docs/...`

---

## Fuera de alcance

- Sin cambios en `app/`
- Sin wiring de platform/programs/intelligence-layer
- Sin reactivación FOS/CEO/Board/Build
- [Otros explícitos]

---

## Archivos creados

- `lib/delivery/types.ts`
- `lib/delivery/index.ts`
- `docs/delivery/README.md`
- _[añadir todos]_

---

## Archivos modificados

- `docs/platform/13_master_roadmap.md` — referencia a 2030.1
- _[o "Ninguno"]_

---

## Arquitectura afectada

- `lib/delivery/` — nuevo módulo de gobernanza
- `docs/delivery/` — guías operativas
- `docs/master-program/` — 2030.1 spec
- _[capas / pilares tocados]_

---

## Riesgos

- Riesgo 1 — mitigación
- Riesgo 2 — mitigación
- _[o "Sin riesgos identificados"]_

---

## Quality gates

| Gate | Resultado | Mensaje |
|------|-----------|---------|
| build | PASS / FAIL | npm run build → exit 0 |
| reset-dev | PASS / FAIL | npm run reset:dev → OK |
| critical-routes | PASS / FAIL | HTTP 200: /, /dashboard, ... |
| forbidden-imports | PASS / FAIL | Sin imports prohibidos en dashboard |
| no-heavy-barrels | PASS / FAIL | |
| no-logic-in-components | PASS / FAIL | |
| fhis-new-ui | PASS / FAIL | N/A si no hay UI nueva |
| scaffold-connection | PASS / FAIL | Scaffold permanece desconectado |

---

## Resultado build

```
npm run build → exit 0
npm run reset:dev → OK (background)
```

---

## Rutas verificadas

- `/` — HTTP 200
- `/dashboard` — HTTP 200
- `/projects` — HTTP 200
- `/new-app` — HTTP 200
- `/design-system` — HTTP 200
- _[opcional: /venture/[id], /intelligence/[id]]_

---

## Plan de rollback

_Describir cómo revertir esta entrega de forma segura._

Ejemplo:

> Revertir el commit de la épica. `lib/delivery` no está importado por `app/` ni `components/`, por lo que el rollback no afecta rutas de producción.

---

## Compatibilidad

_Estado de rutas y módulos existentes._

Ejemplo:

> Sin breaking changes. Build y rutas críticas intactas. `lib/programs/types.ts` preservado.

---

## Próximo paso

1. Paso siguiente 1
2. Paso siguiente 2
3. _[épica o release siguiente]_

---

## Generación programática (opcional)

```typescript
import {
  createDeliveryReport,
  validateDeliveryReport,
  formatDeliveryReportMarkdown,
  runBuildGate,
  runCriticalRoutesGate,
} from "@/lib/delivery";

const report = createDeliveryReport({
  programa: "Master Program 2030",
  epica: "[épica]",
  release: "[release]",
  objetivo: "[objetivo]",
  alcance: [],
  fueraDeAlcance: [],
  archivosCreados: [],
  archivosModificados: [],
  riesgos: [],
  qualityGates: [
    runBuildGate(0),
    runCriticalRoutesGate(["/", "/dashboard", "/projects", "/new-app", "/design-system"]),
  ],
  resultadoBuild: "npm run build → exit 0",
  rutasVerificadas: ["/", "/dashboard", "/projects", "/new-app", "/design-system"],
  rollbackPlan: "[plan]",
  proximoPaso: [],
  arquitecturaAfectada: [],
  compatibilidad: "[compatibilidad]",
});

console.log(formatDeliveryReportMarkdown(report));
console.log(validateDeliveryReport(report));
```
