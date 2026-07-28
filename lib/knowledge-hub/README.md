# Venture Knowledge Hub (Epic 7.5)

Official read-only knowledge index for a venture. Unifies discovery, research, product, architecture, UX, brand, build context, build DNA, deployment, memory, decisions, and global knowledge catalogs.

## Usage

```typescript
import { getOrBuildKnowledgeHubIndex } from "@/lib/knowledge-hub";
import { getVentureById } from "@/lib/store/ventures";

const venture = getVentureById(id);
if (venture) {
  const index = getOrBuildKnowledgeHubIndex(venture);
  // index.tree — document tree with categories
  // index.versions — version history per node
  // index.relations — cross-links (PRD→Research, etc.)
}
```

## Route

`/venture/[id]/knowledge` — FHIS UI with tree, detail panel, versions, relations, and search.

## Adapters (read-only)

| Domain | Source modules |
|--------|----------------|
| Discovery | `venture.discoveryContext`, `lib/discovery` |
| Research / Competitors | `venture.researchReport` |
| Product / PRD | `venture.productPRD`, `productMeta` |
| Architecture | `venture.sections` (arquitectura, backend, frontend, DB) |
| UX | `productPRD`, sections wireframes/ux |
| Brand | sections + `lib/build-platform/build-dna` |
| Build | `buildBuildContextFromVenture`, build DNA, build plan |
| Deployment | build DNA deployment rules |
| Memory | `getVentureMemory`, `getExecutiveRuntimeMemory` |
| Decisions | `getExecutiveGraphForVenture`, `getDecisionsForVenture` |
| Knowledge | `lib/knowledge`, `lib/intelligence/knowledge-context` |

No source modules are modified — adapters only read existing stores and venture fields.

## Search

Token-based full-text search across title, summary, content, and tags. Parent nodes are included when children match.

## Versions

Per-node history from venture timestamps, build context history, venture memory changes, and research/PRD metadata.

## Relations

Predefined cross-links (e.g. PRD→Research, Architecture→PRD) filtered to nodes that exist and have content.
