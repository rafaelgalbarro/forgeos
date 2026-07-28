# Marketplace (RC9 + PROGRAM 4700)

Combined marketplace hub for ForgeOS extensibility.

## Routes

- `/marketplace` — Hub (ecosystem packs + link to agents)
- `/marketplace/agents` — **PROGRAM 4700** AI Agents catalog
- `/marketplace/agents/[agentId]` — Agent detail, install, versions

## RC9 Ecosystem

`/marketplace` renders **EcosystemMarketplaceView** — RC9 pack search and filters.

```typescript
import { searchEcosystemPacks, searchCrmPacks } from "@/lib/marketplace";

const crm = searchCrmPacks();
```

## PROGRAM 4700 AI Agents

```typescript
import { buildMarketplaceCatalog, getAgentById } from "@/lib/agents-marketplace";

const catalog = buildMarketplaceCatalog();
const ceo = getAgentById("ceo");
```

## Docs

| Doc | Topic |
|-----|-------|
| [agent-registry.md](./agent-registry.md) | Catalog spec (13 agents) |
| [install-flow.md](./install-flow.md) | localStorage install registry |
| [versioning.md](./versioning.md) | Semver per agent |
| [ai-runtime-integration.md](./ai-runtime-integration.md) | Read-only adapter |
| [packs.md](./packs.md) | RC9 ecosystem pack types |

## Navigation

Sidebar → Marketplace → Agentes IA (`/marketplace/agents`)
