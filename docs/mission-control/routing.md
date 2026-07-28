# Smart Routing

Location: `lib/mission-control/smart-routing.ts`

## Factory routes

| Intention | Adapter | Destination |
|-----------|---------|-------------|
| VENTURE | `founder-adapter` | `/founder` |
| WEBSITE | `website-factory-adapter` | `/website-factory/[projectId]` |
| APPLICATION | `application-factory-adapter` | `/application-factory/[projectId]` |
| MOBILE | `mobile-factory-adapter` | `/mobile-factory/[projectId]` |
| DISCOVERY | (in-conversation) | stays in Mission Control |

## Dynamic imports

All adapters use `await import("@/lib/...")` so factory pipelines are never bundled on first paint.

## `routeToFactory(intention, idea)`

Creates project/session via adapter and returns `{ factory, href, projectId, label }`.

Legacy routes (Founder, Command Center) remain reachable — Mission Control is the primary gate via sidebar.
