# Venture Knowledge Hub (Epic 7.5)

## Overview

The Venture Knowledge Hub unifies all venture knowledge in a single FHIS interface at `/venture/[id]/knowledge`. It provides a document tree, content preview, version history, cross-document relations, and full-text search — all via read-only adapters.

## Categories

| Category | Sources |
|----------|---------|
| Discovery | `discoveryContext`, discovery answers |
| Research | `researchReport`, competitors |
| Product | `productPRD`, knowledge refs |
| Architecture | venture sections (arquitectura, backend, frontend, DB) |
| UX | PRD screens/flows, wireframes |
| Brand | landing/resumen sections, build DNA branding |
| Build | build context, build DNA, build plan |
| Deployment | build DNA deployment rules |
| Memory | venture memory, executive memory |
| Decisions | decision graph, formal decisions |
| Knowledge | global catalog, intelligence tags |

## Navigation

- From workspace: top bar **Knowledge** link → `/venture/[id]/knowledge`
- From knowledge hub: **← Workspace** → `/venture/[id]`

## Constraints

- No modifications to Runtime, Dashboard, or Build Platform core logic
- All reads go through `lib/knowledge-hub/` adapters
- In-memory index per venture (`knowledge-store.ts`)

## Founder value

Single source of truth for venture documentation — search across PRD, research, architecture, and decisions without hunting through separate modules.
