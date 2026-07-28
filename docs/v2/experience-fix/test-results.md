# Test results — experience-fix

**Date:** 2026-07-24

## Sequential pipeline

| Step | Command | Result |
|------|---------|--------|
| 1 | `npm run kill:ports` | OK — ports 3000/3001 free |
| 2 | `npm run clean` | OK — `.next/` removed |
| 3 | `npm run check:v2-boundaries` | OK — V2 boundaries |
| 4 | `npm run test` | OK — **49/49** (incl. 5 MC status/CTA) |
| 4b | `npm run test:6060` | OK — smoke files + review/mc css |
| 5 | `npm run build` | OK — includes `/mission-control`, `/review`, `/studio`, `/company` |
| 6 | `npm run reset:dev` | OK — Ready on `:3000` |

## Unit — `components/experience/__tests__/mc-status.test.ts`

- completed / executing / blocked / waiting / empty / partial / error tones
- CTA empty → Create Venture
- CTA with decision → `/missions/:id?section=decisions`
- plan stages from labels stay `unknown` (never inferred completed)

## Route smoke — `scripts/smoke-mc-routes.js`

| Route | Status | Chrome | No `#fff` surface fallback in HTML |
|-------|--------|--------|-------------------------------------|
| `/mission-control` | 200 | yes | yes |
| `/studio` | 200 | yes | yes |
| `/review` | 200 | yes | yes |
| `/company` | 200 | yes | yes |
| `/missions/demo` | 200 | yes | yes |
