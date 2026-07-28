# Onboarding — 6 pasos FHIS

El wizard en `/onboarding` guía al fundador desde el registro hasta la primera venture.

## Pasos

1. **Perfil** — Nombre, bio, rol (founder / creator / executive)
2. **Empresa** — Nombre, industria, tamaño de equipo
3. **Objetivos** — Hasta 5 objetivos del fundador
4. **Mercado** — Categoría, audiencia, TAM, competidores
5. **Primera Venture** — Nombre, idea (mín. 20 chars), prioridad
6. **CEO Briefing** — Prioridades ejecutivas y confirmación

## Almacenamiento

- Clave: `forgeos-founder-onboarding` (localStorage)
- API: `getFounderOnboardingState`, `advanceFounderOnboarding`, `completeFounderOnboarding`

## Finalización

Al completar el paso 6, `finalizeFounderJourney`:

1. Crea venture en `lib/store/ventures`
2. Vincula al workspace activo (`linkVentureToWorkspace`)
3. Siembra timeline, knowledge y memory
4. Redirige a `/workspace?welcome=1&ventureId=...`

## Validación

`validateFounderStep(stepId, state)` devuelve mensaje de error en español o `null` si el paso es válido.

## UI

Componente: `components/founder-journey/OnboardingWizard.tsx`

Usa componentes FHIS: `Input`, `Select`, `Button`, `CeoCard`, `Progress`, `Panel`.
