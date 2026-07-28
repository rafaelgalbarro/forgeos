# Founder Journey — Program 3000 Sprint 2

Recorrido unificado del fundador en ForgeOS: elimina la fragmentación entre `/founder`, `/creator`, `/os` y `/live`.

## Flujo

```
Landing → Register → Onboarding → Workspace → Create Venture → CEO → Organization → Live → Venture Factory
```

## Módulos (`lib/founder-journey/`)

| Archivo | Rol |
|---------|-----|
| `journey-manager.ts` | Orquesta pasos, finalización y rutas post-onboarding |
| `onboarding-wizard.ts` | Lógica del wizard de 6 pasos (FHIS) |
| `progress-tracker.ts` | Progreso % del recorrido completo |
| `welcome-dashboard.ts` | Datos del Welcome Dashboard |
| `ceo-welcome.ts` | Contenido del CEO Briefing |
| `initial-timeline.ts` | Seed de eventos en intelligence-layer history |
| `initial-knowledge.ts` | Seed de knowledge evolution |
| `initial-memory.ts` | Seed de venture memory y prefs |
| `redirects.ts` | Mapeo de rutas legacy |
| `types.ts` | Tipos Sprint 2 + Epic 7.1 |

## Componentes (`components/founder-journey/`)

- `OnboardingWizard.tsx` — UI de 6 pasos
- `ProgressTracker.tsx` — Barra y milestones
- `WelcomeDashboard.tsx` — Dashboard de bienvenida en workspace
- `CeoWelcomePanel.tsx` — Panel CEO Briefing
- `FounderJourneyShell.tsx` — Shell con banner legacy y navegación

## Integración Sprint 1

- **Auth**: `syncProfileFromOnboarding` → `updateProfile`
- **Workspace**: `linkVentureToWorkspace`, `updateUserPreferences`
- **Ventures**: `saveVenture` en `lib/store/ventures`
- **Intelligence**: `recordVentureHistoryEvent`, `wrapKnowledgeEntry`, `syncVentureMemory`

## Rutas

| Ruta | Uso |
|------|-----|
| `/onboarding` | Wizard 6 pasos |
| `/workspace` | Welcome + ventures vinculados → `/os` |
| `/founder-journey` | Recorrido por fases (Epic 7.1) |
| `/founder`, `/creator` | Legacy con banner al recorrido unificado |

## Documentación

- [onboarding.md](./onboarding.md)
- [flow.md](./flow.md)
