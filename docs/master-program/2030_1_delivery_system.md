# Master Program 2030.1 — Program Governance & Delivery System

Versión: **2030.1.0**  
Código: `lib/delivery/`  
Documentación operativa: `docs/delivery/`

Este documento define el sistema de gobernanza y entrega para el Master Program 2030. No introduce wiring en `app/` ni cambios de UI.

---

## 1. Cómo se crea una épica

1. Identificar el objetivo de la entrega (módulo lib, docs, scaffold, etc.).
2. Asignar un `id` único en kebab-case (ej. `2030-1-delivery-system`).
3. Registrar con `registerEpic()` en el epic registry operativo (`lib/delivery/epic-registry.ts`).
4. Definir `title`, `objective`, `status` inicial (`draft` o `planned`).
5. Documentar alcance y fuera de alcance antes de implementar.

El epic scaffold en `lib/programs/*/program.ts` es arquitectura estática; el registry operativo es la fuente de verdad para entregas.

Ver: [docs/delivery/01_epics.md](../delivery/01_epics.md)

---

## 2. Asignación a programa

Cada épica pertenece a **un** de los 5 programas:

| ProgramId | Programa |
|-----------|----------|
| `venture-core` | Venture Core |
| `venture-execution` | Venture Execution |
| `venture-intelligence` | Venture Intelligence |
| `venture-platform` | Venture Platform |
| `venture-ecosystem` | Venture Ecosystem |

```typescript
assignEpicToProgram(epicId, programId);
```

La validación usa `PROGRAM_IDS` de `lib/programs/constants.ts`. Consultar [pillar-program-mapping.md](./pillar-program-mapping.md) para ownership de módulos.

---

## 3. División en releases

Épicas grandes se dividen con `divideEpicIntoReleases(epicId, releaseSpecs[])`:

- Cada release tiene `id`, `version`, `title`, opcionalmente `featureIds` y `targetDate`.
- El `programId` del release se hereda de la épica.
- Features se vinculan con `linkFeaturesToRelease(releaseId, featureIds)`.
- Cada release completado genera su propio `DeliveryReport`.

Ver: [docs/delivery/02_release_process.md](../delivery/02_release_process.md)

---

## 4. Quality gates

Ocho gates obligatorios en `QUALITY_GATES`:

1. `npm run build` → exit 0
2. `npm run reset:dev` → entorno dev estable
3. Rutas críticas HTTP 200
4. Sin imports prohibidos en dashboard
5. Sin barrels pesados
6. Sin lógica en componentes React
7. FHIS para UI nueva
8. Política de conexión scaffold

Evaluación: `evaluateQualityGates(results)`.

Ver: [docs/delivery/03_quality_gates.md](../delivery/03_quality_gates.md)

---

## 5. Qué significa terminado

Una épica/release está **terminado** cuando:

- Registro completo (épica + releases si aplica)
- Alcance cumplido y fuera de alcance respetado
- Todos los gates obligatorios pasan
- `DeliveryReport` validado sin errores
- Riesgos, rollback y próximo paso documentados
- Sin breaking changes en rutas existentes

Ver: [docs/delivery/05_definition_of_done.md](../delivery/05_definition_of_done.md)

---

## 6. Documentar riesgos

En cada `DeliveryReport`, el campo `riesgos: string[]` es obligatorio.

Formato recomendado:

```
Riesgo — mitigación
```

Ejemplos:

- `Duplicación con programs/types DeliveryReport — versión completa solo en lib/delivery`
- `Sin riesgos identificados — entrega solo lib/docs`

`validateDeliveryReport()` rechaza informes sin riesgos documentados.

---

## 7. Evitar scaffold conexión prematura

Módulos en program modules con `connected: false` (ej. `lib/ceo`, `lib/fos`, `lib/platform/launch`) no deben importarse en `app/` o `components/` sin:

1. Épica registrada en epic registry
2. Release registrado en release registry

Helpers:

- `getScaffoldModules()` / `getDisconnectedModules()`
- `canConnectModule(modulePath, { epicRegistered, releaseRegistered })`
- `getScaffoldConnectionPolicy(modulePath, connected, options)`
- `scaffoldConnectionGate(modulePath, connected)`

Principio: **Scaffold Before Wire** (PROGRAM_PRINCIPLES).

---

## 8. Validar build

```bash
npm run build
```

Debe terminar con exit 0. En código:

```typescript
const gate = runBuildGate(process.exitCode ?? 0);
```

Incluir resultado en `resultadoBuild` del informe:

```
npm run build → exit 0
```

---

## 9. Validar rutas críticas

Rutas obligatorias:

- `/`
- `/dashboard`
- `/projects`
- `/new-app`
- `/design-system`

Opcionales: `/venture/[id]`, `/intelligence/[id]`

```typescript
runCriticalRoutesGate([
  "/",
  "/dashboard",
  "/projects",
  "/new-app",
  "/design-system",
]);
```

Documentar en `rutasVerificadas` del informe. Verificar manualmente o en CI con HTTP 200 tras `npm run reset:dev`.

---

## 10. Generar delivery report

```typescript
import {
  createDeliveryReport,
  validateDeliveryReport,
  formatDeliveryReportMarkdown,
} from "@/lib/delivery";

const report = createDeliveryReport({ /* campos completos */ });
const errors = validateDeliveryReport(report);
const markdown = formatDeliveryReportMarkdown(report);
```

Plantilla: [docs/delivery/examples/release-report-template.md](../delivery/examples/release-report-template.md)

El tipo completo `DeliveryReport` incluye: programa, epica, release, objetivo, alcance, fueraDeAlcance, archivos, riesgos, qualityGates, resultadoBuild, rutasVerificadas, rollbackPlan, proximoPaso, arquitecturaAfectada, compatibilidad.

---

## Excepción de gobernanza

`lib/delivery/` es infraestructura transversal de gobernanza (como `lib/programs/shared/`). **No** se importa desde `app/` ni `components/`. Uso en scripts, CI y documentación.

## Script CI

```bash
node scripts/check-quality-gates.js
```

Escanea `components/dashboard` por imports prohibidos.

## Relación con 2030.0

| 2030.0 | 2030.1 |
|--------|--------|
| `lib/programs/` architecture | `lib/delivery/` operational governance |
| Documentación gobernanza | Épicas, releases, gates, informes |
| Enforcement por review | Gates + script + validateDeliveryReport |
