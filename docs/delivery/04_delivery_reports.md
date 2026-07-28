# Cómo generar un delivery report

## Tipo

`DeliveryReport` completo en `lib/delivery/types.ts`.

## Crear

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
  epica: "2030.1 — Program Governance & Delivery System",
  release: "2030.1.0",
  objetivo: "lib/delivery/ + docs sin wiring UI",
  alcance: ["lib/delivery/", "docs/delivery/", "scripts/check-quality-gates.js"],
  fueraDeAlcance: ["app/", "components/", "wiring platform/programs"],
  archivosCreados: ["lib/delivery/index.ts", "docs/delivery/README.md"],
  archivosModificados: [],
  riesgos: ["Duplicación parcial con DeliveryReport en programs/types — documentado"],
  qualityGates: [
    runBuildGate(0),
    runCriticalRoutesGate(["/", "/dashboard", "/projects", "/design-system"]),
  ],
  resultadoBuild: "npm run build → exit 0",
  rutasVerificadas: ["/", "/dashboard", "/projects", "/design-system"],
  rollbackPlan: "Revertir commit; lib/delivery no importado por app",
  proximoPaso: ["2030.2 — lint moduleToProgram en CI"],
  arquitecturaAfectada: ["lib/delivery", "docs/delivery", "docs/master-program"],
  compatibilidad: "Sin cambios en app/ ni comportamiento UI",
  autor: "ForgeOS Agent",
});
```

## Validar

```typescript
const errors = validateDeliveryReport(report);
if (errors.length > 0) {
  console.error(errors);
}
```

Validaciones:

- Campos string obligatorios no vacíos
- Arrays presentes
- Al menos un archivo creado o modificado
- Quality gates sin fallos
- Rutas verificadas documentadas
- Al menos un riesgo documentado

## Exportar markdown

```typescript
const md = formatDeliveryReportMarkdown(report);
// Guardar en docs/delivery/examples/ o adjuntar al PR
```

## Plantilla

Ver [examples/release-report-template.md](./examples/release-report-template.md).

## Diferencia con programs/types.ts

`lib/programs/types.ts` define un `DeliveryReport` parcial histórico (campos reducidos). Para entregas 2030.1+ usar siempre la versión completa de `lib/delivery`.
