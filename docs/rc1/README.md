# ForgeOS RC1

**ForgeOS RC1 COMPLETADO**

Release Candidate 1 unifica Program 1 (Runtime), Program 2 (Build Platform) y Program 3 (Founder Experience / Venture Intelligence) en un flujo end-to-end demostrable.

## Qué incluye RC1

| Módulo | Ruta principal | Estado |
|--------|----------------|--------|
| **Runtime Kernel** | `/lab/executive-runtime`, `/lab/*` | Completo |
| **Build Platform** | `/lab/build-context` → `/lab/release-manager` | Completo |
| **Founder Experience** | `/founder`, `/creator`, `/founder-journey` | Completo |
| **CEO Workspace** | `/ceo` (+ `/dashboard` clásico) | Completo |
| **Venture Workspace** | `/venture/[id]` | Completo |
| **Timeline** | `/venture/[id]/timeline` | Completo |
| **Knowledge Hub** | `/venture/[id]/knowledge` | Completo |
| **RC1 Validation** | `/lab/rc1` | Completo |

## Venture canónico: VANDL

**VANDL** (Vandalism & Asset Notification Detection Layer) es el caso E2E de referencia:

- ID: `demo-venture-vandl` (alias: `vandl`)
- Fixture: `lib/fixtures/vandl-venture.ts`
- Seed automático en localStorage vía `lib/store/vandl-seed.ts`

## Flujo E2E validado

```
Idea → Research → CEO → Board → Product → Architecture
  → Build Context → Build DNA → Factories → Release Package → Deploy Spec
```

Validación programática: `lib/lab/rc1-validation-lab.ts`  
UI de checklist: `/lab/rc1`

## Rutas estables (no modificar)

- `/dashboard` — Release 0.3.0 CEO Office (sin cambios funcionales)
- `/lab/*` — Runtime y Build Platform labs
- Founder: `/founder`, `/creator`, `/ceo`, `/founder-journey`
- Venture: `/venture/[id]`, `/venture/[id]/timeline`, `/venture/[id]/knowledge`

## Documentación RC1

- [architecture.md](./architecture.md) — diagrama de integración
- [integration.md](./integration.md) — conexión de módulos + walkthrough VANDL
- [known-limitations.md](./known-limitations.md) — limitaciones RC1
- [next-roadmap.md](./next-roadmap.md) — epics post-RC1

## Verificación local

```bash
npm run kill:ports
# eliminar .next y node_modules/.cache
npm run build
npm run reset:dev
```

Todas las rutas listadas deben responder HTTP 200.
