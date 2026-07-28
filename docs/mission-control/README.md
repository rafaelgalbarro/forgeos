# Mission Control — PROGRAM 5100

Mission Control is the **primary product experience** at `/mission-control`. One conversation flow coordinates CEO, Executive Council, and intelligent factories.

## Quick start

- Route: `/mission-control`
- Persisted missions: `/mission-control/[missionId]`
- Library: `lib/mission-control/` (coordinator only — no engine duplication)

## Principles

1. **Conversation only** — no wizards or huge forms in Mission Control UI
2. **One decision per response** — CEO voice, brief Spanish tone
3. **Adapter pattern** — factories and engines accessed via public APIs only
4. **Light first paint** — server loads `buildMissionControlSnapshot()` only; client panels are `dynamic()` with `ssr: false`

## Mission flow

`UNDERSTAND → PLAN → BUILD → VALIDATE → DEPLOY → OPERATE → EVOLVE`

## Intention types

| Card | Type | Routes to |
|------|------|-----------|
| 🏢 Crear Empresa | VENTURE | Founder Zero |
| 🌐 Crear Sitio Web | WEBSITE | Website Factory |
| 💻 Crear Aplicación | APPLICATION | Application Factory |
| 📱 Crear App Móvil | MOBILE | Mobile Factory |
| 💡 Descubrir Oportunidad | DISCOVERY | In-conversation exploration |

See also: [architecture.md](./architecture.md), [mission-flow.md](./mission-flow.md)
