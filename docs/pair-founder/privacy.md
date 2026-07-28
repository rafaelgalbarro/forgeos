# Privacy

## Data collected (Founder Profile)

Workspace-scoped profile fields:

- objetivos, experiencia, sectores
- tolerancia al riesgo, presupuesto, tiempo disponible
- preferencias, tipo empresa deseada, estrategia crecimiento, restricciones

**Not collected**: personal identifiers beyond what founder voluntarily types, financial account numbers, government IDs, health data.

## Storage

All data stored in browser `localStorage` (client-side only in v0.1):

- `forgeos-founder-profile-{workspaceId}`
- `forgeos-pair-founder-memory-{missionId}`
- `forgeos-pair-founder-prefs-{missionId}`

## AI Runtime

When `ENABLE_REAL_AI=true`, context blocks may be compiled via AI Runtime adapters. No chain-of-thought or internal reasoning is shown to users.

## No new memory model

Pair Founder reads from existing Founder Memory, Venture Memory, and Decision Graph via adapters. It does not create parallel storage for the same facts.

## User control

- Founder can reject recommendations (test case E) — system maintains coherence
- No changes applied without explicit decision resolution in Decision Center
