# Agent Registry — Catalog Spec

PROGRAM 4700 seed catalog with 13 executive/operational agents.

## Agents

| Slug | Name | Department | Status | AI Task |
|------|------|------------|--------|---------|
| `ceo` | CEO Agent | Executive | available | ceo-brief |
| `cto` | CTO Agent | Engineering | available | build-architecture |
| `cfo` | CFO Agent | Finance | available | classification |
| `cmo` | CMO Agent | Marketing | available | marketing |
| `coo` | COO Agent | Operations | available | strategy |
| `research` | Research Agent | Intelligence | available | research |
| `marketing` | Marketing Agent | Marketing | available | marketing |
| `legal` | Legal Agent | Legal | available | legal |
| `sales` | Sales Agent | Sales | beta | classification |
| `support` | Support Agent | Customer Success | beta | classification |
| `developer` | Developer Agent | Engineering | available | code |
| `qa` | QA Agent | Engineering | beta | code |
| `data` | Data Agent | Analytics | available | classification |

## Agent Fields

Each `MarketplaceAgent` includes:

- **descripción** — `description` (Spanish)
- **capacidades** — `capabilities[]` with label, description, category
- **skills utilizadas** — `skills[]` referencing `lib/skills/registry` by ID (read-only)
- **coste estimado** — `estimatedCostPerMonth`, `estimatedCostPerCall`
- **proveedor IA recomendado** — `recommendedProvider` (RuntimeProviderId)
- **versión** — `version` + `AgentVersion` history
- **estado** — `status`: available | installed | beta | coming-soon | deprecated

## API

```typescript
import { getAgentById, listAllAgents, buildMarketplaceCatalog } from "@/lib/agents-marketplace";

const ceo = getAgentById("ceo");
const catalog = buildMarketplaceCatalog({ tag: "engineering" });
```
