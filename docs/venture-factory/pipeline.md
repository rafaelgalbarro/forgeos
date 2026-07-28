# Venture Factory — Pipeline (18 stages)

| # | Stage ID | Label | Output |
|---|----------|-------|--------|
| 1 | idea | Idea | Parse command + vertical |
| 2 | research | Research | Discovery adapter (optional) |
| 3 | mercado | Mercado | TAM/SAM/SOM, segments |
| 4 | competidores | Competidores | Competitor profiles |
| 5 | pricing | Pricing | Plans + unit economics |
| 6 | business_model | Business Model | BMC canvas |
| 7 | naming | Naming | Company name + domain |
| 8 | brand | Brand | Identity kit |
| 9 | landing | Landing | Hero + sections copy |
| 10 | prd | PRD | MVP features + metrics |
| 11 | architecture | Arquitectura | Stack + diagram |
| 12 | ux | UX | User flows + wireframes |
| 13 | frontend | Frontend | Pages + components |
| 14 | backend | Backend | API routes + services |
| 15 | database | Database | Tables + migrations |
| 16 | deployment | Deployment | Preview deploy plan |
| 17 | marketing | Marketing | Channels + launch week |
| 18 | revenue_dashboard | Revenue Dashboard | KPIs + funnel |

Total simulated duration: ~8s (staggered `durationMs` per stage).

## Engine events

- `started`
- `stage_begin` / `stage_end`
- `completed`
- `cancelled`
