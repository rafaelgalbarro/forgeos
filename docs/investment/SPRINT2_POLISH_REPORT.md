# ForgeOS Investment — Sprint 2 Polish Report

**Date:** 2026-08-04  
**Scope:** UI polish · UX clarity · performance cleanup only (no new product features)  
**Safety posture (unchanged):** `LIVE_TRADING_ENABLED=false` · `IBKR_READ_ONLY=true` · `TRADING_MODE=ANALYSIS_ONLY` · orders never sent  
**Inspection method:** Code + CSS review (`localhost:3000` was **not** reachable during this pass)

---

## Verdict

### **NOT_READY_FOR_BETA**

Sprint 2 improved finish quality on the main Investment surfaces, but beta readiness is blocked by:

1. **Sprint 1 dependency** — A parallel agent was actively validating / fixing CRITICAL data-truth (DEMO / NO_DATA / REAL labeling, Alpha/Opportunity/Portfolio honesty). Those fixes were in flight and not independently re-certified in this polish pass.
2. **No live UI smoke** — Dev server was down; visual QA was CSS/component review only.
3. **Platform readiness already scoped below beta** — `docs/investment/V1_RELEASE_READINESS.md` remains **READY_FOR_INTERNAL_TESTING**, not beta / live.
4. **Strategy readiness** remains **NOT_READY** per existing certification docs (outside Sprint 2 scope, but relevant to any “beta” claim).

Polish work here must **not** be read as clearing Sprint 1 CRITICAL honesty gates.

---

## Classification summary

| Area | Status after Sprint 2 | Notes |
|------|----------------------|--------|
| **UI** | Improved | Density, tables, charts, badges, empty states tightened |
| **UX** | Improved | Clearer report history/compare, research summary, opp AI callouts |
| **Performance** | Improved (partial) | Dashboard clock isolation; slower opp poll; research visibility pause |
| **Architecture** | Untouched (by design) | No new modules; CSS modules + targeted component polish |
| **Quality / honesty** | Preserved (not re-proven) | Labels left intact; Sprint 1 still owns truth certification |

---

## Before → After (by surface)

### 1. Dashboard (`InvestmentTerminalDashboard` + terminal CSS)

| Before | After |
|--------|--------|
| Full terminal re-rendered every 1s for world clocks | `WorldClockStrip` owns the 1s timer; session map ticks at 30s |
| Opportunities side-rail polled every 12s | Poll interval **20s** (still visibility-gated) |
| Panels forced `min-height: 120px` → empty whitespace | `min-height: 0`; tighter strip/gap density |
| Heatmap / empty copy felt sparse | Stronger heat contrast; clearer empty line-height |
| Weak focus affordances | `:focus-visible` on retry; reduced-motion respect |

**Files:**  
`styles/investment/terminal-dashboard.module.css`  
`components/investment/InvestmentTerminalDashboard.tsx`

### 2. Opportunities

| Before | After |
|--------|--------|
| Flat table hover / detail prose | Row hover + focus ring; metric mono values |
| AI / thesis summaries looked like body text | `oppAiExplain` callout for explain/thesis/AI sections |
| Filters lacked focus ring | Focus-visible on selects/controls |

**Files:**  
`styles/investment/workspace.module.css` (additive opp polish)  
`components/investment/opportunity-scanner-dashboard.tsx` (class only on section summary — no data/logic change)

### 3. Portfolio

| Before | After |
|--------|--------|
| Heatmap cells low contrast / flat | Slightly larger cells, weight, radius |
| Positions table header muted blue-gray | Sticky accent header; scroll max-height; focus-within |
| Equity timeline SVG flush / unframed | Framed `timelineSvg` |
| Metric cards taller empty feel | Slightly reduced min-heights + radius |

**Files:**  
`styles/investment/portfolio-management.module.css`  
`components/investment/portfolio-allocation-charts.tsx`  
*(Avoided heavy rewrite of `PortfolioManagementDashboard.tsx` — Sprint 1 conflict risk)*

### 4. Orders (Execution Manager)

| Before | After |
|--------|--------|
| Flat timeline list | Left-rail timeline with accent dots |
| Soft state pills | Bolder uppercase pills |
| Weak keyboard focus on toolbar | Focus-visible on buttons/inputs |

**Files:**  
`styles/investment/execution-manager.module.css`

### 5. Research

| Before | After |
|--------|--------|
| Executive summary same as muted body | `researchSummary` (title color, ~78ch, 1.55 line-height) |
| Alerts severity not tinted | CRITICAL / WARN color classes |
| Symbol list selection unclear | `aria-pressed` + selected/focus styles |
| 45s poll ran while tab hidden | Visibility gate before refresh |

**Files:**  
`styles/investment/workspace.module.css`  
`components/investment/ResearchEngineDashboard.tsx`

### 6. Reports

| Before | After |
|--------|--------|
| History used cramped `panelList` + inline styles | Dedicated `reportsLayout` / history cards / active state |
| Export actions mixed into filter bar | `reportExportBar` |
| Comparative block nested awkwardly | `reportComparePanel` |
| Equity SVG unframed | `equityChartSvg` |

**Files:**  
`styles/investment/workspace.module.css`  
`components/investment/ReportsCenterDashboard.tsx`  
`components/investment/EquityCurveChart.tsx`

---

## Performance notes

| Change | Risk | Benefit |
|--------|------|---------|
| Isolate world clock component | Low | Stops 1 Hz full-dashboard React re-renders |
| Session open/closed tick 30s | Low | Session windows don’t need per-second precision |
| Opp poll 12s → 20s on Dashboard | Low | Less duplicate pressure vs Opportunity Center (8s) |
| Research poll skips when hidden | Low | Matches dashboard coordinator pattern |
| No mass `useMemo` / `useCallback` adds | — | Followed repo constraint |

**Remaining gaps**

- Opportunity Center still polls at 8s independently of Dashboard (acceptable; don’t couple while Sprint 1 edits that file).
- Screener + dashboard + opportunities can still overlap when multiple tabs open.
- Charts remain lightweight SVG (good); no virtualization for very long order/audit tables yet.

---

## Accessibility

**Done (lightweight)**

- Focus-visible rings on nav, filters, reports, orders toolbar, portfolio retry, terminal retry
- `aria-pressed` on research symbol list
- `prefers-reduced-motion` for home-card hover / refreshing opacity
- Responsive tweaks for terminal strips / heat cells under 640px

**NICE TO HAVE (skipped — no existing shortcut system)**

- Full keyboard shortcut map (g d dashboard, g o orders, etc.)
- Skip-to-content link inside Investment product shell
- High-contrast theme token audit beyond current ForgeOS investment palette
- Screen-reader live regions for poll refresh announcements

---

## Architecture / Quality

- **No new features / modules / live trading paths.**
- **Data-truth labels preserved** in polished surfaces (`NO_DATA`, `ANALYSIS_ONLY`, DEMO badges untouched as product semantics).
- Prefer **CSS modules + additive classes** to reduce merge conflict with Sprint 1 on:
  - `PortfolioManagementDashboard.tsx`
  - `InvestmentProductShell.tsx`
  - `MarketsTerminal.tsx`
  - Strategy Lab / Alpha orchestrators
- Existing coordinator pattern (`dashboard-data-coordinator`) left intact.

---

## Remaining gaps (honest)

1. **Sprint 1 CRITICAL honesty** — re-run / merge Sprint 1 report before any beta label.
2. **Browser visual QA** — walk Dashboard → Opportunities → Portfolio → Orders → Research → Reports on `:3000`.
3. **Empty / DEMO states** — still visually “warn amber”; consider stronger DEMO chip contrast once Sprint 1 freezes labels.
4. **Reports bilingual mix** (ES filter copy / EN elsewhere) — UX consistency debt, not fixed here.
5. **Keyboard shortcuts** — documented as NICE TO HAVE above.
6. **Chart libraries** — none added; SVG sparklines are fine for internal testing, not “pro terminal” charts.

---

## Key UI files changed

```
styles/investment/terminal-dashboard.module.css
styles/investment/workspace.module.css
styles/investment/portfolio-management.module.css
styles/investment/execution-manager.module.css
components/investment/InvestmentTerminalDashboard.tsx
components/investment/ReportsCenterDashboard.tsx
components/investment/ResearchEngineDashboard.tsx
components/investment/EquityCurveChart.tsx
components/investment/portfolio-allocation-charts.tsx
components/investment/opportunity-scanner-dashboard.tsx   # additive class only
docs/investment/SPRINT2_POLISH_REPORT.md                 # this file
```

---

## Suggested next steps (not Sprint 2)

1. Complete / merge Sprint 1 data-truth certification.
2. Start `npm run investment:dev` and do a visual checklist on the six polished surfaces.
3. Only then reconsider promotion from **READY_FOR_INTERNAL_TESTING** toward a constrained **beta (analysis-only)** label — still **not** live trading.

---

## Final readiness line

**Sprint 2 polish: DONE (scoped)**  
**Product beta readiness: NOT_READY_FOR_BETA** (depends on Sprint 1 CRITICAL closure + visual smoke + existing internal-testing gate)
