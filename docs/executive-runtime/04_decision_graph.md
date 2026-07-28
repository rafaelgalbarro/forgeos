# Decision Graph

## Writers

`lib/ai-orchestration/decision-graph-writer.ts`

## Node types

`Decision`, `Recommendation`, `Risk`, `Opportunity`, `Priority`, `Blocked`, `Approved`, `Rejected`, `Deferred`

## Storage

- Milestone decisions: `forgeos-intelligence-decisions` (existing `Decision` type)
- Executive graph nodes: `forgeos-executive-decision-graph` (`ExecutiveGraphNode`)

## Node fields

`id`, `ventureId`, `nodeType`, `source`, `title`, `rationale`, `impact`, `confidence`, `reversible`, `dependencies`, `createdAt`

## CEO path

`writeCeoDecisionFromOutput()` creates:

- Primary `Decision` node
- Up to 3 `Risk` nodes from critical risks
- Up to 3 `Opportunity` nodes
- Up to 3 `Blocked` nodes

## Board path

Each board debate writes a `Recommendation` node linked to the source task.

## Consensus path

`writeConsensusDecision()` writes `Approved` or `Deferred` depending on consensus level.

## Query

`getExecutiveGraphForVenture(ventureId)` — read nodes for a venture.
