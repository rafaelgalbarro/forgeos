# CEO Runtime

## Role

The AI CEO synthesizes portfolio and venture context into an executive briefing: summary, priorities, risks, opportunities, blocked ventures, next actions, confidence, and time horizon.

## Entry points

- `runExecutiveIntelligence()` — full pipeline in `lib/ceo-office/executive-runtime.ts`
- `runCeoAiTask()` — single orchestrated task in `lib/platform/ceo/ai-adapter.ts`
- `getCeoOfficeBriefing()` — dashboard-safe bridge in `lib/ceo-office/ceo-ai-bridge.ts`

## Context sources

Discovery, Research, Product PRD, Venture Simulator, Knowledge refs, Venture Memory, Decision Graph, Portfolio Memory, Founder Memory (via context builder).

## Tasks

| Task ID | Purpose |
|---------|---------|
| `CEO_BRIEF` | Executive briefing (primary dashboard path) |
| `CEO_REVIEW` | Strategic review |
| `CEO_PRIORITY` | Founder priorities |
| `CEO_RISK` | Risk analysis |

## Output schema (`CeoOutput`)

Structured JSON only — validated by `response-validator.ts`. Extended fields (Epic 3.2): `executiveSummary`, `topPriorities`, `criticalRisks`, `growthOpportunities`, `blockedVentures`, `recommendedNextActions`, `confidence`, `timeHorizon`.

## Pipeline

1. Build orchestration context (`context-builder.ts`)
2. Gateway completion (`ai-gateway/router.ts`)
3. Validate response
4. Write execution memory + observability
5. Write decision graph nodes (Decision, Risk, Opportunity, Blocked)
6. Persist CEO review in executive memory

No direct OpenAI/Anthropic calls from CEO modules.
