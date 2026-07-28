# AI Control Center — Program 3000 Sprint 4

Centro de control para la activación de IA real en ForgeOS. Solo Design Partners con flags y API keys configuradas pueden ejecutar proveedores reales.

## Ruta

- **`/ai`** — Panel FHIS con estado de proveedores, telemetría, fallback y modo de activación.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| `lib/ai-control/types.ts` | Tipos del panel |
| `lib/ai-control/design-partner-gate.ts` | Puerta Design Partner |
| `lib/ai-control/provider-health.ts` | Health checks por proveedor |
| `lib/ai-control/control-panel.ts` | Snapshot del panel (server) |
| `components/ai-control/AiControlCenter.tsx` | UI FHIS en español |

## Pipeline

```
Executive Mesh → runtime-adapter → AI Runtime → Provider Adapter → Telemetry
```

Los módulos de negocio **nunca** llaman proveedores directamente. Todo pasa por `runAIRuntime` / `executeOrchestrationAi`.

## Lab relacionado

- `/lab/ai-runtime` — Vista técnica RC6 con enlace al Centro de Control.

## Documentación

- [activation.md](./activation.md) — Cómo activar IA real
- [design-partners.md](./design-partners.md) — Acceso Design Partners
