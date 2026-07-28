# ForgeOS RC1 — Integration Guide

## Mapa de integración

```
Founder (/founder)
  └─► Creator (/creator) — walkthrough VANDL
        ├─► Research → Knowledge (/venture/demo-venture-vandl/knowledge)
        ├─► CEO (/ceo)
        ├─► Board → Founder Journey (/founder-journey)
        ├─► Product → Venture Workspace (/venture/demo-venture-vandl)
        └─► Build → Labs (/lab/build-context … /lab/release-manager)

CEO Workspace (/ceo)
  └─► Portfolio ventures → Venture Workspace
  └─► Dashboard clásico (/dashboard) — sin cambios

Venture Workspace (/venture/[id])
  ├─► Timeline (/venture/[id]/timeline)
  ├─► Knowledge (/venture/[id]/knowledge)
  └─► Cross-links: Founder, Creator, CEO

RC1 Validation (/lab/rc1)
  └─► lib/lab/rc1-validation-lab.ts — 11 pasos E2E
```

## Módulos y archivos

| Módulo | Lib | UI |
|--------|-----|-----|
| VANDL fixture | `lib/fixtures/vandl-venture.ts` | — |
| Venture resolver | `lib/venture/resolve-venture.ts` | — |
| RC1 validation | `lib/lab/rc1-validation-lab.ts` | `components/lab/Rc1ValidationLab.tsx` |
| Cross-links | `lib/rc1-integration/routes.ts` | `components/rc1/Rc1NavLinks.tsx` |
| Founder | — | `components/founder/FounderHomeView.tsx` |
| Creator | — | `components/creator/CreatorFlowView.tsx` |
| CEO Workspace | `lib/ceo-workspace/` | `components/ceo-workspace/CeoWorkspaceView.tsx` |
| Founder Journey | `lib/founder-journey/` | `components/founder-journey/FounderJourneyView.tsx` |
| Venture Workspace | `lib/venture-workspace/` | `components/venture-workspace/VentureWorkspaceView.tsx` |

## Walkthrough VANDL

### 1. Idea
- **Ruta:** `/founder` o `/creator`
- **Datos:** `VANDL_VENTURE.ideaText`, `name`
- **Validación:** texto ≥ 20 chars

### 2. Research
- **Ruta:** `/venture/demo-venture-vandl/knowledge`
- **Datos:** `researchReport.marketSummary`, competidores
- **Knowledge refs:** PropTech playbook, Edge CV patterns

### 3. CEO Review
- **Ruta:** `/ceo`
- **Datos:** `intelligenceAccepted`, `buildVentureCeoBrief()`
- **Narrativa:** prioridades, riesgos, agenda

### 4. Board Decision
- **Ruta:** `/founder-journey`
- **Datos:** `ventureSimulatorResult.recommendation`
- **Fases:** ceo-review + board-decision completas

### 5. Product
- **Ruta:** `/venture/demo-venture-vandl` (sección Product)
- **Datos:** `productPRD` con MVP scope

### 6. Architecture
- **Ruta:** Venture workspace → Architecture
- **Datos:** sección `arquitectura` en `sections[]`

### 7. Build Context
- **Ruta:** `/lab/build-context`
- **API:** `buildBuildContextFromVenture(venture)`
- **Output:** completeness score ≥ 40%

### 8. Build DNA
- **Ruta:** `/lab/build-dna`
- **API:** `createBuildDnaFromContext(context)`
- **Output:** stack + completeness ≥ 50%

### 9. Factories
- **Rutas:** `/lab/frontend-factory`, `/lab/backend-factory`, etc.
- **API:** `create*Factory().generateBlueprint()`
- **Output:** pages, modules, entities, tests, providers

### 10. Release Package
- **Ruta:** `/lab/release-manager`
- **API:** `createReleaseManager().buildReleasePackage({ venture })`
- **Output:** artifacts, quality gates, approvals

### 11. Deploy Spec
- **Ruta:** `/lab/infrastructure-factory`
- **Output:** `deploymentChecklist` del release package

## Ejecutar validación

```typescript
import { runRc1ValidationLab } from "@/lib/lab/rc1-validation-lab";

const result = runRc1ValidationLab();
console.log(result.passed, result.passedCount, result.totalCount);
```

## Seed VANDL en browser

```typescript
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
ensureVandlSeeded(); // idempotente
```

## Sidebar RC1

La sección **RC1** en el sidebar enlaza Founder, Creator, CEO WS, Journey y RC1 Lab sin alterar la navegación principal del dashboard.
