# PROGRAM 5800 — Investor Mode

**Mission Control integration for venture fundraising preparation.**

## Overview

Investor Mode generates 8 investor deliverables by adapter-wrapping existing Venture Intelligence engines — no new scoring or financial engines are created.

## Deliverables

| # | Deliverable | Generator |
|---|-------------|-----------|
| 1 | Data Room | `data-room-generator.ts` |
| 2 | Investor Deck | `investor-deck-generator.ts` |
| 3 | Financial Model | `financial-model-generator.ts` |
| 4 | Valuation Summary | `valuation-summary-generator.ts` |
| 5 | Due Diligence Checklist | `due-diligence-checklist.ts` |
| 6 | Investor FAQ | `investor-faq-generator.ts` |
| 7 | Funding Plan | `funding-plan-generator.ts` |
| 8 | Investor Readiness Score | `investor-readiness-scorer.ts` |

## Venture Intelligence Adapters

Read-only bridge in `adapters/venture-intelligence-adapter.ts`:

- **lib/venture-intelligence/** — `buildVentureIntelligenceSnapshot`, valuation, runway, DD, investor room
- **lib/venture-e2e/** — `computeE2EReadiness` for E2E investor score
- **lib/founder-zero/** — `computeReadinessLevels` for founder validation score
- **lib/intelligence-network/** — `runIntelligenceNetwork` for network benchmarks
- **pair-founder/venture-memory** — mission context and key facts

## Triggers

1. User message containing investor keywords (`inversión`, `funding`, `investor`, `ronda`, etc.)
2. Mission phase `VALIDATE` or `OPERATE` (auto-trigger on phase advance)
3. Click **Investor Readiness** in `MissionProgressPanel`

## Persistence

```
localStorage: forgeos-investor-{missionId}
```

## Readiness Score Methodology

Composite 0–100 score with weighted breakdown:

| Dimension | Weight |
|-----------|--------|
| Data Room completeness | 15% |
| Investor Deck | 10% |
| Financial Model | 12% |
| Valuation | 8% |
| Due Diligence | 15% |
| FAQ | 8% |
| Funding Plan | 12% |
| Venture Intelligence | 20% |

Each dimension scores document/checklist completeness (ready=100, partial=50, missing=0).

## UI

`components/mission-control/investor/InvestorModePanel.tsx` — tabbed hub with lazy `dynamic()` imports for all 8 views. Spanish FHIS labels.

## Live Mission Events

- `Investor Deck generado`
- `Readiness Score: {score}%`

## Public API

```ts
import {
  generateInvestorPackage,
  readInvestorPackage,
  detectInvestorIntent,
  buildInvestorModeSnapshot,
} from "@/lib/mission-control/investor-mode";
```
