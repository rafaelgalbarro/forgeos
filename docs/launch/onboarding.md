# Onboarding — ForgeOS 1.0

## Pasos del wizard

1. **Welcome** — introducción a ForgeOS
2. **Profile** — nombre, empresa, rol (founder/creator/executive)
3. **Goals** — objetivos personalizados (hasta 5)
4. **Workspace** — elegir ruta de primera venture
5. **Complete** — entrar a `/os` o crear venture demo

## State machine

- `lib/launch/onboarding-flow.ts`
- Storage key: `forgeos-onboarding`
- Funciones: `advanceOnboarding`, `completeOnboarding`, `getVentureEntryPath`

## Rutas de venture

| Opción | Ruta |
|--------|------|
| Venture Factory | `/venture-factory` |
| Founder Journey | `/founder-journey` |
| Founder Dashboard | `/founder` |

## Analytics

- `onboarding_start` al cargar wizard
- `onboarding_step` en cada avance
- `onboarding_complete` al finalizar
