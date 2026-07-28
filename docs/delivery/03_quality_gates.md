# Quality gates obligatorios

Todo trabajo marcado como terminado debe pasar estos gates. Definidos en `lib/delivery/quality-gates.ts` como `QUALITY_GATES`.

## Lista de gates

### 1. Production build

```bash
npm run build
```

Debe terminar con **exit 0**. Stub: `runBuildGate(exitCode)`.

### 2. Dev environment reset

```bash
npm run reset:dev
```

Limpia `.next` y arranca dev estable. Documentado para CI; stub: `runResetDevGate(ok)`.

### 3. Critical routes HTTP 200

Rutas **obligatorias**:

- `/`
- `/dashboard`
- `/projects`
- `/new-app`
- `/design-system`

Rutas **opcionales** (venture/intelligence):

- `/venture/[id]`
- `/intelligence/[id]`

Stub: `runCriticalRoutesGate(verifiedRoutes)`.

### 4. Forbidden imports in dashboard

`components/dashboard/**` no debe importar:

| Módulo | Razón |
|--------|-------|
| `lib/fos` | Kernel desconectado |
| `lib/ceo` | CEO office desconectado |
| `lib/board` | Board desconectado |
| `lib/build-engine` | No en dashboard bundle |
| `lib/platform` | Platform no wired |
| `lib/programs` | Governance no wired |
| `lib/delivery` | Governance no wired |

Helper: `checkForbiddenImportsInPaths(paths, content)`.

Script local:

```bash
node scripts/check-quality-gates.js
```

### 5. No heavy barrels

Evitar `index.ts` que re-exportan módulos enteros. Exportar solo APIs necesarias. Revisión manual + stub `runNoHeavyBarrelsGate()`.

### 6. No logic in React components

Lógica de negocio en `lib/`; componentes solo presentación. Stub `runNoLogicInComponentsGate()` — futura regla ESLint.

### 7. FHIS for new UI

Nueva UI debe seguir Forge Health & Interface Standards (`docs/design-system/`). Stub `runFhisNewUiGate()`.

### 8. Scaffold connection policy

Módulos con `connected: false` en program modules no deben conectarse a `app/` sin épica y release. `scaffoldConnectionGate(modulePath, connected)` y `canConnectModule()`.

## Evaluación agregada

```typescript
import {
  runBuildGate,
  runCriticalRoutesGate,
  evaluateQualityGates,
} from "@/lib/delivery";

const results = [
  runBuildGate(0),
  runCriticalRoutesGate(["/", "/dashboard", "/projects", "/new-app", "/design-system"]),
  // ... más gates
];

const { passed, summary } = evaluateQualityGates(results);
```

## En el informe de entrega

Incluir `qualityGates: QualityGateResult[]` en el `DeliveryReport`. Gates fallidos bloquean `validateDeliveryReport()`.
