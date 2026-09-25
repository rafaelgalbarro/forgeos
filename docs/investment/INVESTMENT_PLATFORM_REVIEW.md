# ForgeOS Investment — Platform Functional Review (QA Lead)

**Document type:** ANALYSIS_ONLY validation — no product fixes applied  
**Review date:** 2026-08-04  
**Auditor posture:** Launch-tomorrow professional financial platform QA  
**Verdict:** **NOT READY FOR LIVE / PRODUCTION TRADING** — suitable only as locked analysis + paper/shadow research shell until IBKR, Market Intelligence, and strategy-sample gates clear.

---

## 1. Executive summary / go-live readiness

ForgeOS Investment boots as a coherent Next.js product surface: **30/30** primary routes return HTTP 200 with correct titles; safety rails remain **ANALYSIS_ONLY** with `orderExecution: disabled`, `LIVE_TRADING_ENABLED=false`, `IBKR_READ_ONLY=true`, `AUTONOMOUS_LIVE=LOCKED`. Order mutation APIs correctly refuse broker changes (`wouldMutateBroker: false`). Existing certification docs (`GO_LIVE_DECISION.md`) correctly state **NOT_READY_FOR_LIVE**.

However, as a **professional investment OS launching tomorrow**, the platform fails several hard gates:

1. **IBKR FastAPI (:8000) is down** — every `/api/broker/*` probe returned **503 SERVICE_UNAVAILABLE**; portfolio/monitor/risk fall back to **DEMO** measured numbers that look operational.
2. **Market Intelligence has zero configured providers** — research, screener, news, and probe-gather are honest empty/`CONFIG_REQUIRED`, so the “brain” cannot produce live dossiers.
3. **Opportunity / Alpha price levels are synthetic and inconsistent** — candidates stamp `dataQuality: "fresh"` with shared ~756 entry zones for AAPL/SPY/TLT while DEMO portfolio marks AAPL at 190; Alpha also emits EURUSD≈134 and SPY growth entry≈117. This is a trust-breaking data integrity defect for any operator-facing surface.
4. **Strategy readiness remains FAIL** — distinct sessions = 1 (need ≥10); Strategy Lab certs all `INSUFFICIENT_SAMPLE` / `livePromotionAllowed: false`, yet library UI shows high Sharpes (e.g. 3.42) on 24-trade DEMO/PAPER samples — easy to misread as production-ready performance.
5. **RSC HTML for investment routes embeds a Next.js 404 ErrorFallback** (`"status":404,"message":"This page could not be found."`) alongside valid page titles — soft-navigation / flight-data defect needing root-cause before launch polish.

**Go-live readiness one-liner:** Ready only as a **locked ANALYSIS_ONLY research UI**; **not** ready for supervised live, autonomous live, or any claim of production-grade market/portfolio fidelity.

| Gate | Status |
| --- | --- |
| Safety locks (no real transmit) | **PASS** (observed) |
| IBKR connectivity | **FAIL** (service down) |
| Market data / MI providers | **FAIL** (0 configured) |
| Strategy readiness | **FAIL** (documented + reconfirmed via APIs) |
| Opportunity/Alpha price honesty | **FAIL** (synthetic + inconsistent) |
| Reports path | **PARTIAL** (APIs + prior PDF artifacts exist; email stubbed) |
| UI route availability | **PASS** (HTTP) / **PARTIAL** (thin shells + RSC 404 payload) |

---

## 2. Method & environment

| Item | Value |
| --- | --- |
| Workspace | `ForgeOS_App_Factory_v0_1` |
| Date / time (UTC) | 2026-08-04 ≈ 11:48–12:00Z |
| App server | `http://localhost:3000` — **UP** (verified; `/investment` HTTP 200 ≈ 429 ms) |
| IBKR FastAPI | `http://localhost:8000` — **DOWN** (connection refused) |
| Node | `forgeos-node` v22.16.0 (`%LOCALAPPDATA%\forgeos-node\node.exe`); system `node` not on PATH |
| `.env` | **Not present** in workspace root; safety defaults observed via API (`ANALYSIS_ONLY`, live=false, ibkrReadOnly=true). `.env.example` documents required safe defaults. |
| Browser MCP (`cursor-ide-browser`) | **Unavailable** — repeated `browser_navigate` / `newTab` failed with “No browser tab available.” Visual/screenshot smoke **not completed**; UI/UX findings from HTML titles, payload sizes, code, and API behavior. |
| HTTP route crawl | 30 investment pages |
| API probes | 22 investment + 7 broker endpoints; orders POST dry-run cancel |
| Code / docs | Product map, go-live / strategy certs, opportunity providers, polling components |
| Safety | No flag flips; no `transmit=true`; cancel POST only; account IDs shown only as already-masked `PAPER_SIM` |

Probe artifacts (working copies): `.forgeos/qa-api-probe.json`, `.forgeos/qa-deep/*.json`, `.forgeos/live-risk-audit-routes-qa.json`.

---

## 3. Findings by severity

### CRÍTICO

#### C1 — IBKR broker service unavailable (blocks live portfolio/orders/sync)
- **Evidence:** All `/api/broker/{status,accounts,positions,orders,account-summary,executions,connection}` → **503** body `{"connected":false,"state":"SERVICE_UNAVAILABLE","error":"IBKR service is not running"}` (latency 4.8–21.6 s). Dashboard: `brokerStatus.state=STALE`, `error="IBKR service is not running"`, `dataSource=DEMO`, `maskedAccounts=["PAPER_SIM"]`.
- **Impact:** No real accounts, positions, orders, executions, market-data history sync, or TWS latency measurement. Staged `transmit=false` order path against TWS cannot be validated in this session.
- **Launch risk:** Any demo that implies “connected broker terminal” is false.

#### C2 — Synthetic opportunity/Alpha prices presented as actionable analysis
- **Evidence:** `GET /api/investment/opportunities` returns candidates with `scanDurationMs: 4`, provider path `synthetic-normalized` (code: `src/core/investment/opportunity/infrastructure/providers.ts`). AAPL/SPY/TLT share `entryZone` ≈ **756–759** while DEMO portfolio marks AAPL **190**. Alpha rejects include `entryEstimated: 756.11` for AAPL/SPY/TLT, EURUSD **134**, SPY growth **117**, AAPL growth **100**, plus id `alpha-DELAYED-DEMO-*` (correctly rejected for delayed data). Fields claim `dataQuality: "fresh"` on many rejects.
- **Impact:** Operator can believe levels/stops/targets are market-derived. Cross-module inconsistency (portfolio vs opportunities) destroys trust.
- **Honesty gap:** Research/MI correctly say NO_DATA; Opportunity/Alpha still emit rich numeric levels from synthetic bars.

#### C3 — DEMO portfolio metrics look “MEASURED” while IBKR is down
- **Evidence:** `GET /api/investment/portfolio` → `dataSource: "DEMO"`, note *“DEMO fallback — IBKR snapshot failed”*, yet `summary.portfolioValue.status: "MEASURED"`, positions AAPL/MSFT/JPM with PnL, Sharpe **-0.517**, Sortino **-0.523**, beta **1.659**, correlations **0.972**, sector Technology **91.5%**. Risk API overall light **RED** on DEMO monitor.
- **Impact:** Risk/portfolio dashboards can be mistaken for live book analytics during outage.

#### C4 — Strategy readiness / go-live permanently blocked; Lab metrics easy to over-read
- **Evidence:** APIs stamp `strategyReadiness: "NOT_READY"`, `goLive: "NOT_READY_FOR_LIVE"`, `distinctSessions: 1`. Strategy Lab certifications: `INSUFFICIENT_SAMPLE`, `SL07_SESSIONS` fail, `livePromotionAllowed: false`. Docs: `STRATEGY_READINESS_CERTIFICATION.md` FAIL (expectancy −0.143, 1 session). Lab ranking still surfaces Sharpe **3.42** (low-volatility) on **24** trades.
- **Impact:** Launching “tomorrow” into supervised live would violate the platform’s own gates; UI density of strong metrics increases misinterpretation risk.

#### C5 — Zero Market Intelligence providers → Research Brain empty
- **Evidence:** `/api/investment/market-intelligence` `totalConfigured: 0`; screener `empty: true`, `providersConfigured: 0`; research engines all `CONFIG_REQUIRED` except pattern=`STUB`; dossiers `overall: NO_DATA`; probe-gather empty.
- **Impact:** Research, news, calendar, screener cannot fulfill “Investment Brain” product promise without env keys/flags.

### IMPORTANTE

#### I1 — Next.js RSC payload embeds 404 ErrorFallback on investment pages
- **Evidence:** HTML for `/investment` and others includes flight data `props:{"status":404,"message":"This page could not be found."}` and title fragment `404: This page could not be found.` while document `<title>` remains correct (e.g. “Opportunity Center - ForgeOS Investment”). Present on thin and heavy pages alike.
- **Impact:** Possible soft-nav glitch, duplicate error UI, or broken parallel segment; needs App Router investigation before launch.

#### I2 — Aggressive overlapping client polling
- **Evidence:** Opportunity Center **8s**; Live **8s**; Market Scanner **12s**; home terminal opportunities **12s** + markets **30s**; Portfolio/Execution **10s**; Markets terminal **15s**; Product shell broker status **15s**; Research **45s**. Opportunity + Alpha + home opp poll can thrash the same heavy orchestrators concurrently.
- **Impact:** Elevated CPU/network; duplicate Alpha/scanner work; poor laptop battery / multi-tab risk.

#### I3 — Slow APIs under DEMO/outage path
- **Evidence (single-threaded probe):** portfolio **9.2s**, alpha-engine **10.9s**, live **10.4s**, probe-gather **10.8s**, broker status **21.6s** (timeout-ish 503), strategy-lab **6.2s**, market-scanner **5.7s**.
- **Impact:** First paint / refresh UX feels broken; amplifies polling cost (I2).

#### I4 — Thin / shell modules
- **Evidence:** `/investment/news`, `/calendar`, `/signals`, `/ai-lab` — smaller payloads / shell+widget pattern (code inventory). `/investment/broker` and `/investment/strategy` are **redirects** (broker→orders, strategy→strategies) while PRODUCT_MAP still describes Broker as a live terminal path.
- **Impact:** Nav IA vs reality mismatch; empty-feeling modules for news/calendar without MI.

#### I5 — Orders & IBKR market-data capability gaps
- **Evidence:** `/api/investment/orders` `dataSource: "UNAVAILABLE"`, `orders: []`. `/api/investment/ibkr-market-data` documents `missingPaths`: `/api/ibkr/market-data`, `/bars`, `/quotes`; history route exists but unusable while :8000 down. Staged transmit=false scripts exist but were **not** runnable without IBKR (by design this session).
- **Impact:** Execution Manager is dry-run-only shell until broker recovers; streaming quotes still missing by design.

#### I6 — Opportunity Center empty of A+/A while candidates still synthetic
- **Evidence:** `opportunities: []`, `count: 0`, quality filter A+/A only; candidates present (5) with high scores but Alpha grades REJECTED (`duplicate`, `cooldown-active`, grade gates). Field wiring admits `probabilidad`, `capitalRecomendado`, `volatilidad` = **NO_DATA**.
- **Impact:** Correct empty high-quality list; underlying candidate generation still misleading (C2).

#### I7 — Reports email / Excel maturity
- **Evidence:** Reports APIs return daily + morning-briefing history; weekly/monthly/annual auto-generated on GET. Code/docs: CSV-for-Excel (no native xlsx); email stubbed unless enabled. Prior daily PDF referenced in API (`daily_pdf_2026-08-04_...`, paperPnl `-5.44`, shadowPnl `NO_DATA`).
- **Impact:** Acceptable for ANALYSIS_ONLY ops, not for institutional distribution workflows.

#### I8 — No workspace `.env` while server runs
- **Evidence:** `.env` missing; only `.env.example` safety lines confirmed. Runtime still reports locked mode (good defaults), but MI keys / IBKR URL may be unset or only in process environment outside repo.
- **Impact:** Environment reproducibility risk for ops handoff.

### MEJORA

#### M1 — Duplicate AAPL rows in DEMO portfolio
- Evidence: portfolio positions list two AAPL lots (40@170 and 10@175) without clear lot labeling in API summary.

#### M2 — Stress test framing
- Evidence: `stressTest` reports “80 breach(es)” from monitor alerts, note says not a full scenario engine — label can alarm operators.

#### M3 — Monte Carlo / optimizer identical p5/p95 on some strategies
- Evidence: Strategy Lab Monte Carlo for several strategies shows identical median/p5/p95 equity — weak distribution signal (bootstrap on tiny sample).

#### M4 — Character encoding glitches in JSON notes
- Evidence: mojibake in API notes (`â`, `Ã³`) on Windows clients — presentation polish.

#### M5 — Continuous analysis stopped by default
- Evidence: `/api/investment/continuous-analysis` `status: "stopped"`, `cyclesCompleted: 0` (scanner endpoint can still run a cycle on demand).

#### M6 — Committee / AI Committee alias duplication
- Evidence: Both routes render same view — fine functionally; IA redundancy.

### NICE TO HAVE

#### N1 — Browser MCP visual regression not executed (tooling gap this session)
#### N2 — Streaming IBKR quotes (already documented as missing)
#### N3 — Native Excel (.xlsx) export
#### N4 — Pattern research engine beyond STUB
#### N5 — Darker density / table polish for terminal aesthetic (code-visible shells)

---

## 4. Route matrix

HTTP crawl 2026-08-04; status from `Invoke-WebRequest`. **Result** = functional judgment (not raw HTTP). Timings ≈ wall ms for full HTML.

| Route | HTTP | ≈ms | Result | Notes |
| --- | ---: | ---: | --- | --- |
| `/investment` | 200 | 402 | **PASS** | Dashboard title OK; RSC 404 payload present (I1); DEMO/STALE broker |
| `/investment/markets` | 200 | 4302 | **PARTIAL** | Loads; MI empty → limited market truth |
| `/investment/research` | 200 | 2315 | **PARTIAL** | Honest CONFIG_REQUIRED / NO_DATA |
| `/investment/opportunities` | 200 | 1822 | **PARTIAL** | UI/API up; A+/A empty; synthetic candidates (C2) |
| `/investment/portfolio` | 200 | 1063 | **PARTIAL** | DEMO MEASURED book (C3) |
| `/investment/orders` | 200 | 5917 | **PARTIAL** | Execution Manager; broker UNAVAILABLE; dry-run OK |
| `/investment/strategies` | 200 | 1197 | **PASS** | Large payload; lab/strategies wired |
| `/investment/strategy` | 200 | 2056 | **PASS** | Redirect → strategies |
| `/investment/risk` | 200 | 2966 | **PARTIAL** | Heavy payload; RED on DEMO |
| `/investment/committee` | 200 | 3276 | **PASS** | Wired |
| `/investment/ai-committee` | 200 | 2119 | **PASS** | Alias of committee |
| `/investment/reports` | 200 | 6983 | **PASS** | Reports center + history APIs |
| `/investment/news` | 200 | 2982 | **PARTIAL** | Thin / NO_DATA without MI |
| `/investment/calendar` | 200 | 1817 | **PARTIAL** | Thin / NO_DATA without MI |
| `/investment/settings` | 200 | 2679 | **PASS** | Flags + probe |
| `/investment/broker` | 200 | 3404 | **PARTIAL** | Legacy redirect → orders; map still says Broker live |
| `/investment/live` | 200 | 3039 | **PASS** | LOCKED read-only (correct) |
| `/investment/paper` | 200 | 8278 | **PASS** | Slow but wired |
| `/investment/shadow` | 200 | 6967 | **PASS** | Wired |
| `/investment/alpha` | 200 | 6202 | **PARTIAL** | Wired; synthetic levels (C2); 0 A+ |
| `/investment/strategy-lab` | 200 | 2074 | **PARTIAL** | Rich metrics; NOT_READY / sample gates |
| `/investment/screener` | 200 | 6756 | **PARTIAL** | Empty without MI keys |
| `/investment/scanner` | 200 | 2839 | **PASS** | Wired; cycle can run |
| `/investment/signals` | 200 | 2310 | **PARTIAL** | Thin shell |
| `/investment/audit` | 200 | 3747 | **PASS** | Timeline items present |
| `/investment/compare` | 200 | 4421 | **PASS** | Paper vs shadow |
| `/investment/performance` | 200 | 3482 | **PASS** | Wired |
| `/investment/backtesting` | 200 | 7824 | **PASS** | Heavy; no broker transmit |
| `/investment/execution-control` | 200 | 3634 | **PARTIAL** | Scaffolding / composition meta |
| `/investment/ai-lab` | 200 | 3786 | **PARTIAL** | Thin shell |

**Broken routes (hard 404 HTTP):** none observed.  
**Soft defect:** RSC 404 ErrorFallback embedded on crawled pages (I1).

### API matrix (selected)

| API | HTTP | ≈ms | Result |
| --- | ---: | ---: | --- |
| `/api/investment/dashboard` | 200 | 202 | PASS (DEMO/STALE honest error) |
| `/api/investment/monitor` | 200 | 149 | PARTIAL (DEMO book running) |
| `/api/investment/opportunities` | 200 | 133 | PARTIAL (C2) |
| `/api/investment/portfolio` | 200 | 9183 | PARTIAL (C3) |
| `/api/investment/orders` GET | 200 | 4713 | PARTIAL (empty/unavailable) |
| `/api/investment/orders` POST cancel | 200 | — | **PASS** dry-run lock |
| `/api/investment/strategies` | 200 | 3207 | PASS |
| `/api/investment/risk` | 200 | 2008 | PARTIAL |
| `/api/investment/research` | 200 | 2033 | PARTIAL (CONFIG_REQUIRED) |
| `/api/investment/screener` | 200 | 128 | PARTIAL (empty) |
| `/api/investment/audit` | 200 | 1939 | PASS |
| `/api/investment/live` | 200 | 10420 | PASS (LOCKED) |
| `/api/investment/reports*` | 200 | 3.7–4.8s | PASS / PARTIAL |
| `/api/investment/alpha-engine` | 200 | 10902 | PARTIAL (C2) |
| `/api/investment/strategy-lab` | 200 | 6249 | PARTIAL (C4) |
| `/api/broker/*` | **503** | 4.8–21.6s | **FAIL** (C1) |

---

## 5. Module scorecards

Scoring: **A** launch-ready · **B** usable locked · **C** partial / honesty gaps · **D** broken for intended job · **F** unsafe / misleading.

| Module | Score | Functional smoke | Honesty | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | **C** | Loads fast | Partial | STALE/DEMO broker; widgets poll |
| Markets | **C** | Loads | Weak without MI | Depends on providers |
| Research | **B−** | Loads | **Strong** NO_DATA | Empty until keys |
| Opportunities | **D+** | Loads | **Weak** | Empty A+/A good; synthetic candidates bad |
| Portfolio | **C−** | Loads | Weak under outage | DEMO MEASURED |
| Orders / Execution | **B** | Loads | Strong lock | No IBKR data; dry-run cancel PASS |
| Strategies | **B** | Loads | OK | Catalog + readiness stamps |
| Risk | **C** | Loads | Mixed | RED on DEMO |
| Committee | **B** | Loads | OK | Analysis-only |
| Reports | **B** | Loads | Mostly OK | PDF/history; email stub |
| Broker | **D** | Redirect only | — | Service down; IA mismatch |
| Live | **A−** | Loads | Strong LOCKED | Correct non-trading |
| Paper / Shadow | **B** | Loads | OK | Slow pages |
| Alpha | **D+** | Loads | Weak levels | Gate rejects help; prices don’t |
| Strategy Lab | **C** | Loads | Mixed | Gates honest; metrics loud |
| Screener / Scanner | **C** | Loads | Screener empty honest | Scanner cycles |
| Settings | **B** | Loads | OK | Probe empty |
| News / Calendar / Signals / AI Lab | **C−** | Thin | Honest empty | Shells |
| Performance / Compare / Audit / Backtesting | **B** | Loads | OK | ANALYSIS_ONLY |

### Phase coverage checklist

| Phase | Coverage | Outcome |
| --- | --- | --- |
| FASE 1 Routes | Full HTTP crawl | All 200; soft RSC 404 |
| FASE 2 Modules | API + HTML + code | See scorecards; no browser screenshots |
| FASE 3 IBKR | API + :8000 | **Down**; 503s; no live sync |
| FASE 4 Opportunity | API deep | Sort options present; A+/A empty; synthetic candidates |
| FASE 5 Brain | Research/Alpha/Risk/Portfolio | Research honest empty; Alpha/Opp synthetic; Portfolio DEMO |
| FASE 6 Strategy Lab | API | Metrics + cert FAIL sample; paper label sessions=1 |
| FASE 7 Portfolio analytics | API | Sharpe/Sortino/DD/beta/corr/sectors/CCY/country present on DEMO |
| FASE 8 Orders staged | POST dry-run only | Lock PASS; **no** TWS transmit=false (IBKR down) |
| FASE 9 Reports | APIs | Daily + briefing history; CSV path; immutability by design |
| FASE 10 Performance | Timings + polling | Slow APIs + 8–15s polls |
| FASE 11 UI/UX | Limited (no browser) | Thin shells; IA redirects; density from payload variance |
| FASE 12 Document | This file | — |

---

## 6. Prioritized remediation backlog (no code)

### P0 — before any external demo claiming “live book”
1. Start and health-check IBKR FastAPI (:8000) + TWS/Gateway; re-verify `/api/broker/status` → connected, masked accounts only.
2. Stop presenting synthetic opportunity/Alpha entry/stop/target as `fresh` when provider is `synthetic-normalized` or MI/IBKR absent — force **NO_DATA** or explicit **SYNTHETIC** badge on every numeric level.
3. When `dataSource=DEMO` / broker down, force UI chrome **DEMO** and demote `MEASURED` labels so operators cannot confuse DEMO with IBKR.
4. Do not change go-live decision until Strategy Readiness PASS (sessions ≥10, expectancy/PF gates).

### P1 — before “Investment Brain” marketing
5. Configure at least one market + one news MI provider; re-run research/screener/probe-gather until non-empty honest data.
6. Fix RSC embedded 404 ErrorFallback on `/investment/*`.
7. Coalesce polling (single coordinator; backoff when IBKR down / tab hidden already partial).
8. Align PRODUCT_MAP / nav: Broker redirect vs Orders naming.

### P2 — quality & ops
9. Cap Strategy Lab metric prominence until `distinctSessions` and sample gates pass; always show `tradeDataLabel` + session count adjacent to Sharpe.
10. Add API latency budgets (portfolio/alpha/live &lt; 2s p95 on warm cache).
11. Complete visual QA once browser MCP/tab works (dead buttons, density, tables).
12. Re-run staged `transmit=false` order script against TWS when IBKR up; document latency; never enable LIVE flags for that test.
13. Reports: verify append-only refuse-overwrite under concurrent POST; decide email transport readiness.

### P3 — polish
14. Excel native export; pattern engine; streaming quotes (read-only); encoding cleanup; continuous-analysis default ops runbook.

---

## 7. Safety attestation (this review)

| Control | Observed |
| --- | --- |
| `ANALYSIS_ONLY` / `orderExecution: disabled` | Yes (APIs) |
| `liveTradingEnabled` | `false` |
| `ibkrReadOnly` | `true` |
| Autonomous lock | `LOCKED` |
| Orders POST | Dry-run only; `wouldMutateBroker: false` |
| Real transmitted orders | **0** (not attempted; IBKR down) |
| Flag flips | **None** |
| Account display | `PAPER_SIM` / masked only |

---

## 8. Sign-off

**QA Lead recommendation:** Ship internally only as **locked analysis / paper lab**.  
**Do not** position as production brokerage OS, live portfolio source of truth, or go-live candidate until **C1–C5** are closed and strategy certification flips.

*End of original review — ANALYSIS_ONLY; no product code changes in this review.*

---

## CRITICAL FIX STATUS

Post-review remediation (2026-08-04). Safety flags unchanged: `LIVE_TRADING_ENABLED=false`, `IBKR_READ_ONLY=true`, `TRADING_MODE=ANALYSIS_ONLY`. No live orders.

| ID | Finding | Status | Notes |
| --- | --- | --- | --- |
| **C1** | IBKR FastAPI unavailable / manual-only start | **FIXED** | `npm run investment:dev` → `scripts/investment-dev.js` spawns Next.js + uvicorn, health-polls `:8000/health`, auto-restarts FastAPI, TWS check non-blocking, clean shutdown, duplicate-port guard. Broker proxy continues to return JSON 503 offline (not HTML). Product shell LIVE only when `IBKR_LIVE_READ_ONLY` + connected. |
| **C2** | Synthetic Opportunity/Alpha prices as actionable / `fresh` | **FIXED** | Demo quotes labeled `demo` with null bid/ask; Alpha hard-gates reject non-`live` (`non-real-data`); entry/stop/target/expected return null without REAL+recent price; evidence includes `NO LIVE PRICE`; institutional scanner stamps `priceQuality: DEMO` for synthetic provider. |
| **C3** | DEMO portfolio metrics labeled MEASURED / Live | **FIXED** | Portfolio snapshot uses `ESTIMATED` when `dataSource=DEMO`; UI overlay respects DEMO; refresh chrome shows dataSource (not “Live”). |
| **C4** | Strategy Lab DEMO Sharpe easy to over-read | **FIXED** | Per-row `metricsSource` / `metricsLabel` (`DEMO` \| `INSUFFICIENT_SAMPLE` \| …); `readiness=NOT_READY`; `productionRankingEligible=false` for DEMO/insufficient; production ranking score demoted; Alpha ignores non-eligible lab ranking. |
| **C5** | Zero MI providers / empty brain | **FIXED** | Full provider catalog with `NOT_CONFIGURED` vs `CONFIGURED`; Settings panel shows Provider / Status / Last Success / Latency / Data Types / Errors. `.env.example` enables zero-key ECB + WorldBank + RSS (no invented keys). Partial operation with one provider supported. |

### Residual (non-blocking for internal ANALYSIS_ONLY testing)

- Strategy readiness / go-live gates remain **NOT_READY** by design until sample sessions pass certification.
- RSC embedded 404 ErrorFallback (I1) and polling density (I2) were IMPORTANTE — not part of this CRITICAL pass.
- Live IBKR book still requires FastAPI + TWS + matching API key; supervisor starts FastAPI but cannot invent TWS login.

**Follow-up readiness doc:** `docs/investment/V1_RELEASE_READINESS.md` → **READY_FOR_INTERNAL_TESTING** (not live).
