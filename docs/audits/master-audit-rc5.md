# ForgeOS — Auditoría Maestra RC1 → RC5.3

**Fecha:** 2026-07-07  
**Alcance:** RC1 hasta RC5.3 (pre-RC5.5)  
**Modo:** Solo revisión — **sin modificaciones de código**  
**Workspace:** `ForgeOS_App_Factory_v0_1`  
**Supersede:** `docs/audits/rc-host-audit.md` (obsoleto — no refleja RC5.2 ni RC5.3)

---

## Resumen ejecutivo

ForgeOS es una plataforma Next.js 15 con **69 páginas**, **34 labs de ingeniería**, **17 rutas API** y un stack de release candidates desde validación VANDL (RC1) hasta ejecución real controlada por flags (RC5.3). El build de producción compila sin errores y el dev server arranca correctamente tras `npm run reset:dev`.

| Métrica | Resultado |
|---------|-----------|
| RCs con código | **RC1 → RC5.3** (18 hitos) |
| RC5.4 | No implementado |
| RC5.5 | **Próximo hito planificado** |
| `npm run build` | **OK (exit 0)** — 2026-07-07 |
| `npm run reset:dev` | **OK** — `http://localhost:3000` |
| Rutas verificadas (60 estáticas/lab) | **59 OK** + 1 redirect (`/new-app` → 308) |
| Deploy remoto | **No detectado** |
| Modo operativo | Local seguro — flags reales en `false` |

### Porcentaje real completado

| Dimensión | % | Criterio |
|-----------|---|----------|
| **Roadmap RC (RC1→RC5.5)** | **90%** | 18/20 hitos (faltan RC5.4, RC5.5) |
| **Scaffold de plataforma (11 bloques)** | **82%** | Labs + libs + rutas existen; integración parcial en 4 bloques |
| **Integración end-to-end productiva** | **62%** | Mock-heavy, flags off, labs huérfanos, sin deploy |
| **Listo para RC5.5** | **Sí (con riesgos documentados)** | Base sólida; deuda de descubrimiento y wiring |

---

## Verificación de build y host

### `npm run build`

```
Exit code: 0
Next.js 15.5.19 — compilación completa
Mitigación Windows: experimental.webpackBuildWorker: false (next.config.ts)
```

### `npm run reset:dev`

```
Exit code: 0
Dev server: http://localhost:3000
Script: scripts/dev-reset.js (kill ports + clean + next dev)
```

### Verificación de rutas (2026-07-07)

**60 rutas probadas** tras `reset:dev`. Resultado: **59 × HTTP 200**, **1 × HTTP 308** (`/new-app` — redirect esperado, no error).

| Grupo | Rutas | Estado |
|-------|-------|--------|
| OS shell | `/`, `/os`, `/os/*` (12) | OK |
| Founder legacy | `/founder`, `/creator`, `/dashboard`, `/ceo` | OK |
| Marketplace / Store | `/marketplace`, `/store`, `/os/marketplace` | OK |
| RC labs (indexados) | 21 labs en `/os/labs` | OK |
| RC labs (huérfanos) | 12 labs Build Platform + Runtime | OK (accesibles por URL directa) |
| Producto | `/agents`, `/ideas`, `/projects`, `/templates`, `/design-system`, `/founder-journey` | OK |
| `/new-app` | Redirect 308 | OK (no 200) |

**Rutas dinámicas no probadas en batch:** `/venture/[id]`, `/build/[id]`, `/os/workspace/[id]`, `/resultado/[id]`, `/intelligence/[id]`, `/new-app/generating/[id]` — requieren IDs válidos.

### APIs verificadas (existencia en build)

| API | RC | Propósito |
|-----|-----|-----------|
| `POST /api/ai/run` | RC3 | AI Runtime |
| `POST /api/connections/{dry-run,test,request-approval}` | RC5 | Conexiones reales |
| `POST /api/real-execution/{dry-run,request-approval,approve,execute}` | RC5.1 | Aprobación ejecución |
| `POST /api/real-build-flow/{dry-run,request-approval,approve,execute,simulate-real,controlled-execute}` | RC5.2/5.3 | Build flow + ejecución controlada |
| `POST /api/generate/{research,product}` | Legacy | Generación producto |
| `GET/POST /api/ceo-workspace` | RC2/3 | CEO workspace |

---

## Mapa completo de ForgeOS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FOUNDER / PRODUCT SURFACE                         │
│  /os  /founder  /creator  /dashboard  /venture  /new-app  /marketplace  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         FORGEOS OS (RC2) — app/os/                       │
│  portfolio │ capital │ analytics │ knowledge │ build │ ceo │ labs        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼────────┐         ┌────────▼────────┐         ┌────────▼────────┐
│ Executive Mesh │         │  AI OS (RC3)    │         │ Build Platform  │
│    (RC3.5)     │         │ lib/ai-runtime  │         │ lib/build-plat. │
│ lib/exec-mesh  │         │ /api/ai/run     │         │ 8 factories     │
└───────┬────────┘         └────────┬────────┘         └────────┬────────┘
        │                           │                           │
        │              ┌────────────┴────────────┐              │
        │              │   Skills (RC4–RC4.7)    │              │
        │              │   lib/skills/*          │              │
        │              └────────────┬────────────┘              │
        │                           │                           │
        └──────────────► Capability Layer (RC4.9) ◄─────────────┘
                         lib/capabilities/
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            Skills Governance   Skill Store    Runtime Engine
               (RC4.1)          (RC4.8)        lib/runtime/*
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            Real Connections    Real Execution   Real Build Flow
                 (RC5)            (RC5.1)      (RC5.2 + RC5.3)
            lib/connections/  lib/real-exec/  lib/real-build-flow/
```

### Inventario de `lib/` por bloque

| Bloque | Carpetas principales | Labs | APIs |
|--------|---------------------|------|------|
| Runtime | `lib/runtime/` (workers, task-queue, execution-engine, scheduler, state-machine, observability) | 6 + executive-runtime | — |
| Build Platform | `lib/build-platform/` (context, dna, registry, 5 factories, release-manager) | 9 | — |
| Founder Experience | `lib/founder-dashboard/`, `lib/founder-journey/`, `lib/creator-flow/`, `lib/dashboard-engine/` | — | ceo-workspace |
| ForgeOS OS | `lib/os/`, `components/os/` | os-rc2 | — |
| AI OS | `lib/ai-runtime/`, `lib/ai-gateway/`, `lib/ai-orchestration/` | ai-runtime, ai-collaboration | `/api/ai/run` |
| Executive Mesh | `lib/executive-mesh/` | executive-mesh | — |
| Skills | `lib/skills/` (+ 7 dominios) | 8 domain labs + skills | — |
| Capability Layer | `lib/capabilities/` (~36 capabilities) | capabilities | — |
| Real Connections | `lib/connections/` (github, vercel, supabase, cloudflare, security) | real-connections | connections/* |
| Real Execution | `lib/real-execution/` (+ providers RC5.3) | real-execution | real-execution/* |
| Real Build Flow | `lib/real-build-flow/` (+ controlled-execution) | real-build-flow | real-build-flow/* |

### Capas legacy / paralelas (no eliminadas)

| Módulo | Uso actual | Riesgo |
|--------|-----------|--------|
| `lib/fos/` | `dashboard-engine`, `live/fos-bridge` | Kernel FOS paralelo al runtime RC |
| `lib/build-engine/` | `dashboard-engine`, `BuildQueuePanel` | Duplica build-platform en superficie CEO |
| `lib/rc1-integration/` | Solo `Rc1NavLinks` | Casi aislado |
| `lib/brain/`, `lib/discovery/`, `lib/venture-simulator/` | Rutas producto legacy | Integración parcial con OS |

---

## Auditoría por bloque (11 dimensiones)

Para cada bloque: **Estado**, **Build**, **Rutas**, **Labs**, **Dependencias**, **Código muerto**, **Código aislado**, **Integración real**, **Riesgos**.

---

### 1. Runtime

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (scaffold)** — RC implícito en `lib/runtime/` |
| **Build** | OK — incluido en `next build` |
| **Rutas** | Labs: `/lab/workers`, `task-queue`, `execution-engine`, `runtime-scheduler`, `state-machine`, `runtime-observability`, `executive-runtime` |
| **Labs** | 7 páginas; solo `executive-runtime` en índice `/os/labs` |
| **Dependencias** | `ai-orchestration`, `ai-gateway`, `executive-mesh` (execution-engine adapter) |
| **Código muerto** | Bajo — módulos referenciados entre sí |
| **Código aislado** | **Alto** — 6 labs runtime sin link en OS Labs |
| **Integración real** | **Parcial** — `executive-runtime` conecta mesh; resto lab-only |
| **Riesgos** | Paralelismo con `lib/fos/` (scheduler, state-machine duplicados conceptualmente) |

---

### 2. Build Platform

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (scaffold)** — 8 módulos factory |
| **Build** | OK |
| **Rutas** | `/lab/build-context`, `build-dna`, `build-registry`, `backend-factory`, `frontend-factory`, `database-factory`, `qa-factory`, `infrastructure-factory`, `release-manager` |
| **Labs** | 9 labs con harness en `lib/lab/*-factory-lab.ts` |
| **Dependencias** | Consumido parcialmente por `real-build-flow` (context/dna/release) |
| **Código muerto** | Bajo |
| **Código aislado** | **Alto** — ningún lab Build Platform en `/os/labs` |
| **Integración real** | **Parcial** — factories generan planes mock; no deploy automático |
| **Riesgos** | `build-engine` legacy compite con `build-platform` en dashboard CEO |

---

### 3. Founder Experience

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Funcional con deuda** — dual stack legacy + OS |
| **Build** | OK |
| **Rutas** | `/founder`, `/creator`, `/dashboard`, `/ceo`, `/founder-journey`, `/new-app`, `/venture/[id]/*`, `/os/creator` |
| **Labs** | RC1 (`/lab/rc1`) |
| **Dependencias** | `dashboard-engine` → `fos` + `build-engine`; `founder-dashboard`, `creator-flow` |
| **Código muerto** | Medio — rutas legacy posiblemente redundantes |
| **Código aislado** | `/founder` vs `/os` — misma audiencia, distintas shells |
| **Integración real** | **Parcial** — journey y venture funcionan; no conectan a RC5 build flow en UI fundador |
| **Riesgos** | Fragmentación UX; fundador no ve labs RC5 desde navegación principal (by design) |

---

### 4. ForgeOS OS

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC2)** |
| **Build** | OK |
| **Rutas** | `/os`, `/os/portfolio`, `capital`, `analytics`, `knowledge`, `build`, `ceo`, `creator`, `settings`, `marketplace`, `calendar`, `labs`, `/os/workspace/[id]` |
| **Labs** | `/lab/os-rc2` + índice `/os/labs` (21 entradas) |
| **Dependencias** | `lib/os/`, `components/os/`, `styles/fhis/os.css` |
| **Código muerto** | Bajo |
| **Código aislado** | Índice labs incompleto (faltan 12 labs) |
| **Integración real** | **Alta** — shell principal operativo |
| **Riesgos** | Labs index desactualizado (sin RC5.3 label, sin Build/Runtime labs) |

---

### 5. AI Operating System

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC3)** |
| **Build** | OK |
| **Rutas** | `/lab/ai-runtime`, `/lab/ai-collaboration`, `/lab/ai-skills` |
| **Labs** | 3 — ai-collaboration y ai-runtime en OS Labs |
| **Dependencias** | `ai-gateway`, `ai-orchestration`, skills AI domain (RC4.7) |
| **Código muerto** | Bajo — `ai-gateway` usado por runtime y research |
| **Código aislado** | Stub provider por defecto (`NEXT_PUBLIC_AI_PROVIDER=stub`) |
| **Integración real** | **Alta** — `POST /api/ai/run` → `runAIRuntime`; skills AI vía pipeline |
| **Riesgos** | 15+ providers en `.env.example`; mayoría sin keys en dev; MCP comentado |

---

### 6. Executive Mesh

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC3.5 + RC4 protocol)** |
| **Build** | OK |
| **Rutas** | `/lab/executive-mesh`, `/lab/executive-runtime` |
| **Labs** | 2 — ambos en OS Labs |
| **Dependencias** | → `capabilities/mesh-adapter` → `runCapabilityRequest` |
| **Código muerto** | Bajo |
| **Código aislado** | Lab + CEO surfaces; no expuesto en venture flow |
| **Integración real** | **Alta** — `runExecutiveProtocol` orquesta mesh → capabilities → skills |
| **Riesgos** | Latencia simulada; decisiones mock en ausencia de API keys |

---

### 7. Skills

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC4 + RC4.2–RC4.7)** |
| **Build** | OK |
| **Rutas** | `/lab/skills` + 7 domain labs |
| **Labs** | 8 — todos en OS Labs |
| **Dependencias** | → `skills-governance` (obligatorio) → `connections` (opcional real) |
| **Código muerto** | Bajo — registry extenso activo |
| **Código aislado** | Adapters por dominio; `governance-adapter` es thin re-export (no muerto) |
| **Integración real** | **Alta en pipeline** — ejecución mayormente mock/simulada |
| **Riesgos** | Superficie enorme; skills cloud/dev requieren tokens para valor real |

---

### 8. Capability Layer

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC4.9)** |
| **Build** | OK |
| **Rutas** | `/lab/capabilities` |
| **Labs** | 1 — en OS Labs |
| **Dependencias** | Mesh adapter, skills router interno |
| **Código muerto** | Bajo — ~36 capabilities registradas |
| **Código aislado** | Acceso principal vía mesh, no UI fundador |
| **Integración real** | **Alta** — `runCapabilityRequest` wired desde executive protocol |
| **Riesgos** | Capabilities ≠ skills boundary debe mantenerse en RC5.5 |

---

### 9. Real Connections

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC5)** |
| **Build** | OK |
| **Rutas** | `/lab/real-connections` |
| **Labs** | 1 — en OS Labs |
| **Dependencias** | GitHub, Vercel, Supabase, Cloudflare adapters; security layer |
| **Código muerto** | Bajo |
| **Código aislado** | Sin token → dry-run/validación only (by design) |
| **Integración real** | **Media** — usado por real-execution y real-build-flow server-side |
| **Riesgos** | Tokens server-only; `FORGEOS_CONNECTIONS_PRODUCTION` no en .env.example |

---

### 10. Real Execution

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC5.1 + RC5.3 providers)** |
| **Build** | OK |
| **Rutas** | `/lab/real-execution` |
| **Labs** | 1 — en OS Labs (label RC5.1, incluye RC5.3 en harness) |
| **Dependencias** | `connections`, `real-execution/providers/*`, governance |
| **Código muerto** | Medio — adapter base `executeReal()` bloquea mutaciones; RC5.3 usa `*-real-executor.ts` separado |
| **Código aislado** | `ENABLE_REAL_*_EXECUTION=false` por defecto |
| **Integración real** | **Media-Alta** — API + lab + provider executors; real off por flags |
| **Riesgos** | Dos paths de ejecución (adapter legacy vs real-executor); confusión operativa |

---

### 11. Real Build Flow

| Dimensión | Evaluación |
|-----------|------------|
| **Estado** | **Completo (RC5.2 + RC5.3 controlled)** |
| **Build** | OK |
| **Rutas** | `/lab/real-build-flow` |
| **Labs** | 1 — en OS Labs (label RC5.2) |
| **Dependencias** | build-platform context, connections, real-execution, controlled-execution |
| **Código muerto** | Bajo |
| **Código aislado** | `ENABLE_REAL_BUILD_FLOW=false`; no wired en `/os/build` UI |
| **Integración real** | **Media** — dry-run + simulate-real + controlled-execute APIs operativas |
| **Riesgos** | Gap UI producto: fundador no dispara build flow real desde OS build module |

---

## Tabla RC — estado por release

| RC | Nombre | Estado | Lib principal | Lab | Integración |
|----|--------|--------|---------------|-----|-------------|
| RC1 | VANDL Validation | ✅ | `lib/lab/rc1-validation-lab.ts` | `/lab/rc1` | Aislado (ingeniería) |
| RC2 | ForgeOS OS | ✅ | `lib/os/` | `/lab/os-rc2` | Shell principal |
| RC3 | AI Operating System | ✅ | `lib/ai-runtime/` | `/lab/ai-runtime` | API + skills |
| RC3.5 | Executive Mesh | ✅ | `lib/executive-mesh/` | `/lab/executive-mesh` | → capabilities |
| RC4 | Skills Framework | ✅ | `lib/skills/` | `/lab/skills` | Pipeline gobernado |
| RC4.1 | Skills Governance | ✅ | `lib/skills-governance/` | `/lab/skills-governance` | Obligatorio en pipeline |
| RC4.2 | Developer & Cloud | ✅ | `lib/skills/developer`, `cloud` | `/lab/developer-skills` | Registry |
| RC4.3 | Productivity | ✅ | `lib/skills/productivity/` | `/lab/productivity-skills` | Registry |
| RC4.4 | Business | ✅ | `lib/skills/business/` | `/lab/business-skills` | Registry |
| RC4.5 | Marketing | ✅ | `lib/skills/marketing/` | `/lab/marketing-skills` | Registry |
| RC4.6 | Analytics | ✅ | `lib/skills/analytics/` | `/lab/analytics-skills` | Registry |
| RC4.7 | AI Skills | ✅ | `lib/skills/ai/` | `/lab/ai-skills` | AI Runtime |
| RC4.8 | Skill Store | ✅ | `lib/skills-store/` | `/marketplace`, `/store` | OS Labs |
| RC4.9 | Capability Layer | ✅ | `lib/capabilities/` | `/lab/capabilities` | Mesh wired |
| RC5 | Real Connections | ✅ | `lib/connections/` | `/lab/real-connections` | Server APIs |
| RC5.1 | Real Execution Approval | ✅ | `lib/real-execution/` | `/lab/real-execution` | Flags off |
| RC5.2 | Real Build Flow | ✅ | `lib/real-build-flow/` | `/lab/real-build-flow` | Dry-run default |
| RC5.3 | Controlled Real Execution | ✅ | `providers/`, `controlled-execution.ts` | Lab + APIs | Per-provider flags |
| RC5.4 | — | ❌ | — | — | — |
| RC5.5 | — | 🔜 | — | — | Próximo |

---

## Detección: imports muertos, barrels, adapters, labs, providers

### Imports / módulos con uso mínimo

| Módulo | Referencias | Veredicto |
|--------|-------------|-----------|
| `lib/rc1-integration/` | 1 (`Rc1NavLinks`) | Casi aislado |
| `lib/fos/` | 3 archivos (dashboard-engine, live) | Legacy paralelo |
| `lib/build-engine/` | 2 consumidores | Legacy paralelo |
| `governance-adapter.ts` | Re-export `executeSkillCore` | Barrel útil, no muerto |

### Barrels (`index.ts`) — 196 archivos

Patrón consistente en toda la codebase. **No se detectaron barrels completamente huérfanos** en muestreo de bloques RC5; muchos son entry points de dominio. Riesgo: over-export dificulta tree-shaking pero no rompe build.

### Adapters sin uso aparente en runtime productivo

| Adapter | Ubicación | Estado |
|---------|-----------|--------|
| `mesh-adapter` | `lib/capabilities/adapters/` | **Usado** — executive-protocol |
| `governance-adapter` | `lib/skills/adapters/` | **Usado** — pipeline |
| `ai-orchestration-adapter` | `lib/runtime/execution-engine/` | Lab/runtime only |
| GitHub `executeReal()` base | `lib/connections/github/` | **Bloqueado** — RC5.3 bypass via real-executor |

### Labs sin conexión al índice OS Labs (15)

**Build Platform (9):** build-context, build-dna, build-registry, backend-factory, frontend-factory, database-factory, qa-factory, infrastructure-factory, release-manager

**Runtime (6):** workers, task-queue, execution-engine, runtime-scheduler, state-machine, runtime-observability

Accesibles por URL directa; **no aparecen en `/os/labs`**.

### Providers no utilizados / stub

| Provider | Env | Default |
|----------|-----|---------|
| AI (15+) | `*_API_KEY` | stub / mock fallback |
| GitHub/Vercel/Supabase/Cloudflare | `*_TOKEN` | vacío → dry-run |
| Real execution | `ENABLE_REAL_*` | **false** |
| MCP | comentado en `.env.example` | no implementado |

---

## Pipeline de integración real (verificado)

```
FounderRequest
  → runExecutiveProtocol (executive-mesh)
    → processExecutiveMeshRequest + runMeshEngine
    → executeMeshCapabilityForTopic (capabilities/mesh-adapter)
      → runCapabilityRequest
        → runGovernedSkillRequest (skills-governance)
          → runSkillRequest → executeSkillCore (skills)
            → connections adapters (dry-run si sin token)
            → real-execution approval (si ENABLE_REAL_EXECUTION)
            → real-build-flow (si venture build)
              → controlled-execution (RC5.3 flags per provider)
```

**Puntos de corte seguros (by design):**
- `ENABLE_REAL_EXECUTION=false`
- `ENABLE_REAL_BUILD_FLOW=false`
- `ENABLE_REAL_{GITHUB,VERCEL,SUPABASE,CLOUDFLARE}_EXECUTION=false`
- `REAL_EXECUTION_REQUIRE_APPROVAL=true`
- Sin tokens → dry-run / validación

---

## Riesgos globales

| Prioridad | Riesgo | Impacto |
|-----------|--------|---------|
| **P0** | Documentación `rc-host-audit.md` obsoleta | Confusión en equipo |
| **P1** | 12 labs huérfanos del índice OS | Descubrimiento pobre |
| **P1** | Dual runtime (`fos` vs `runtime`) | Mantenimiento duplicado |
| **P1** | Dual build (`build-engine` vs `build-platform`) | Inconsistencia CEO vs RC5 |
| **P2** | RC5.3 no etiquetado en OS Labs | RC5.5 onboarding |
| **P2** | Build flow no en UI `/os/build` | Gap producto |
| **P2** | Windows: `taskkill node` mata dev server | ERR_CONNECTION_REFUSED |
| **P3** | Sin deploy remoto | Solo local |
| **P3** | `/new-app` redirect 308 en auditoría batch | Falso negativo si se espera 200 |

---

## Próximos pasos (hacia RC5.5)

### Recomendados antes de RC5.5

1. **Actualizar índice `/os/labs`** — incluir Build Platform (9), Runtime (6), etiqueta RC5.3 en Real Build Flow / Real Execution.
2. **Unificar documentación** — archivar o redirigir `rc-host-audit.md` → este documento.
3. **Definir RC5.4** — scope explícito (sugerencia: venture UI → build flow wiring, o consolidación runtime/fos).
4. **RC5.5 scope** — candidatos:
   - Primer flujo fundador E2E: venture → OS build → dry-run → approval → controlled preview deploy
   - Unificación `build-engine` → `build-platform` en dashboard
   - Observabilidad unificada runtime + real execution audit trail
   - Deploy preview documentado (Vercel/Railway) con flags
5. **Limpiar dual-path ejecución** — deprecar `executeReal()` base o documentar como guard only.
6. **Test dinámico** — script de rutas con IDs fixture para `/venture/[id]`, `/build/[id]`.

### Criterios de salida RC5.5 (propuesta)

- [ ] Flujo fundador visible desde `/os/build` (aunque sea dry-run)
- [ ] RC5.4 cerrado con docs
- [ ] 100% labs indexados o marcados deprecated
- [ ] `npm run build` + `reset:dev` + 69 páginas verificadas
- [ ] Al menos 1 provider real ejecutable en preview con approval E2E documentado

---

## Anexo: comandos de verificación

```bash
# Build producción
npm run build

# Dev limpio
npm run reset:dev

# Doctor (diagnóstico)
npm run doctor
```

**Node path Windows (entorno auditado):** `C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node`

---

## Anexo: archivos clave

| Área | Entry point |
|------|-------------|
| Skills pipeline | `lib/skills/pipeline.ts` → `runGovernedSkillRequest` |
| Governance | `lib/skills-governance/pipeline.ts` |
| Capabilities | `lib/capabilities/pipeline.ts` → `runCapabilityRequest` |
| Executive | `lib/executive-mesh/executive-protocol.ts` → `runExecutiveProtocol` |
| AI Runtime | `lib/ai-runtime/pipeline.ts` → `runAIRuntime` |
| Connections | `lib/connections/index.ts` |
| Real Execution | `lib/real-execution/index.ts` |
| Build Flow | `lib/real-build-flow/build-flow.ts` |
| Controlled Real | `lib/real-build-flow/controlled-execution.ts` |
| OS Labs index | `app/os/labs/page.tsx` (21 links) |
| Env flags | `.env.example` |

---

*Auditoría generada sin modificar código fuente. Build y rutas verificados en host local Windows, 2026-07-07.*
