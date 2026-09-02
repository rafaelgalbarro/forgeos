# Sprint 1 — ForgeOS Investment Validation Report

**Date:** 2026-08-04  
**Workspace:** `ForgeOS_App_Factory_v0_1`  
**Branch:** `feature/ibkr-live-supervised-v1`  
**Verdict:** **SPRINT1_STABLE** — suitable for continued internal ANALYSIS_ONLY use

---

## 1. Environment & method

| Item | Value |
|------|--------|
| Stack | `npm run investment:dev` (Next `:3000` + IBKR FastAPI `:8000`) |
| Node | `v22.16.0` via `%LOCALAPPDATA%\forgeos-node` |
| Safety env | `LIVE_TRADING_ENABLED=false`, `IBKR_READ_ONLY=true`, `TRADING_MODE=ANALYSIS_ONLY` |
| TWS/Gateway `:4001` | **OFFLINE** (expected for this run) |
| Browser MCP | Unavailable in this session (tab create/navigate failed); UI validated via HTTP SSR + API probes |
| Artifacts | `.forgeos/sprint1/api-probe.json`, `.forgeos/sprint1/page-probe.json` |

**Method**

1. Cleared stale `:3000`, started `investment:dev` with safety flags forced.
2. HTTP-probed investment + broker APIs; recorded status, latency, payload honesty.
3. HTTP-crawled daily screens for SSR 200 / no Next error markers.
4. Classified bugs; fixed CRITICAL/HIGH with minimal diffs; re-verified.

**Safety confirmation (live APIs):** `liveTradingEnabled=false`, `mode=ANALYSIS_ONLY`, `ibkrReadOnly=true`, Live lock `LOCKED`, Orders `orderExecution=disabled`. No `transmit=true` / order path exercised.

---

## 2. Screen matrix

| Screen | Route | Result | Evidence |
|--------|-------|--------|----------|
| Dashboard | `/investment` | **PASS** | SSR 200 (~0.4–0.7s warm); API dashboard 200; mode ANALYSIS_ONLY; broker DISCONNECTED when TWS offline |
| Markets | `/investment/markets` | **PASS** | SSR 200 (~4.5s first compile) |
| Research | `/investment/research` | **PASS** | SSR 200; research API honest `CONFIG_REQUIRED` / `NO_DATA` (no fabricated news) |
| Portfolio | `/investment/portfolio` | **PASS** (post-fix) | SSR 200; API `dataSource=DEMO`, metrics `ESTIMATED`, clear TWS offline note |
| Opportunities | `/investment/opportunities` | **PASS** | SSR 200; badges `DEMO_SYNTHETIC`; `priceQuality=DEMO`; A+/A gate → `count=0` opportunities |
| Orders | `/investment/orders` | **PASS** | SSR 200; API `dataSource=UNAVAILABLE`, empty orders, live=false |
| Risk | `/investment/risk` | **PASS** | SSR 200; `monitorLabel=DEMO`, lights present |
| Committee | `/investment/ai-committee`, `/investment/committee` | **PASS** | SSR 200 both |
| Reports | `/investment/reports` | **PASS** | SSR 200; reports API 200 |
| Broker | `/investment/broker` | **PASS** (post-fix) | SSR 200; status `TWS_OFFLINE`; account/positions/orders offline-safe JSON |
| Live | `/investment/live` | **PASS** | SSR 200; safety LOCKED / ANALYSIS_ONLY / liveTradingEnabled=false |
| Settings | `/investment/settings` | **PASS** | SSR 200 |
| News | `/investment/news` | **PASS** | SSR 200 |

No page returned Application error / Unhandled Runtime markers in SSR HTML.

---

## 3. Bug log

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| B1 | **HIGH** | **FIXED** | IBKR connect blocked ~12s then crashed with `'NoneType' object has no attribute 'settimeout'` when TWS offline. **Fix:** TCP preflight + socket reset in `services/ibkr-broker/app/main.py`. Account/positions/orders now fail in ~1.3s with structured `TWS_OFFLINE` JSON. |
| B2 | **HIGH** | **FIXED** | `/api/broker/*` remapped real failures to `"IBKR service is not running"` even when FastAPI was up. **Fix:** `classifyIbkrProxyError` + preserve FastAPI structured `detail` in broker route / service-client. |
| B3 | **HIGH** | **FIXED** | Portfolio DEMO fallback labeled metrics `MEASURED` (status captured before provider fallback). **Fix:** compute `metricStatus` after `loadSnapshot()` in `portfolio-management-snapshot.ts`. |
| B4 | **HIGH** | **FIXED** | Monitor showed DEMO cash/capital as `MEASURED` and hid data label. **Fix:** expose `dataLabel`/`dataNote`; remap DEMO observations to `ESTIMATED` in `monitor/route.ts`. |
| B5 | **MEDIUM** | **FIXED** | Portfolio error note showed `[object Object]` when FastAPI returned dict `detail`. **Fix:** stringify structured `detail.error` in `portfolio-analytics-provider.ts`. |
| B6 | **MEDIUM** | **FIXED** (code; supervisor must be restarted to pick up script) | `investment:dev` health flapped FastAPI ONLINE/OFFLINE on single slow probe. **Fix:** require 2 consecutive fails; force `TRADING_MODE=ANALYSIS_ONLY` on child envs. |
| B7 | **MEDIUM** | **FIXED** | Dashboard `brokerStatus.dataSource` stayed `IBKR_LIVE_READ_ONLY` while `state=DISCONNECTED`. **Fix:** `brokerDataSourceForConnection` / `honestBrokerDataSource` — disconnected → `UNAVAILABLE`; LIVE badge only when connected. |
| B8 | **MEDIUM** | **OPEN** | Cold-start / first-compile latencies high (dashboard API first hit ~22–44s; orders/live pages ~20s). Warm path OK. |
| B9 | **MEDIUM** | **OPEN** | Portfolio still ~4s when TWS offline (IBKR attempt + DEMO fallback). Better than 19–45s pre-fix; still above snappy UX. |
| B10 | **LOW** | **OPEN** | FastAPI `/health` requires API key (401 without) — fine for prod; bare probes need key. |
| B11 | **LOW** | **OPEN** | Browser MCP automation unavailable this session — no console/network capture from Chromium. |
| B12 | **LOW** | **OPEN** | Research/News engines all `CONFIG_REQUIRED` without MI keys — honest, but product feels empty until keys set. |

**Fixed count:** 7 (B1–B7)  
**Open count:** 5 (B8–B12), none CRITICAL

---

## 4. IBKR status

| Check | Result |
|-------|--------|
| FastAPI `:8000` | ONLINE (supervisor; 1 restart during sprint) |
| Next broker health | `200` `{ok:true, liveTradingEnabled:false, ibkrReadOnly:true}` |
| Status | `connected:false`, `twsReachable:false`, `state:TWS_OFFLINE` |
| Account / positions / orders | `503` + offline-safe JSON (`state:TWS_OFFLINE`, clear error, no invented balances) |
| Reconnect behavior | Fail-fast when port 4001 closed; no settimeout crash; ForgeOS continues ANALYSIS_ONLY |
| Orders / transmit | Not invoked; Live remains LOCKED |

---

## 5. Performance notes

| Surface | Observed |
|---------|----------|
| Next Ready | ~43s cold |
| First API compiles | 15–44s (dashboard/orders/live worst) |
| Warm dashboard API | ~86–200ms |
| Warm monitor API | ~187ms |
| Portfolio after TWS preflight fix | ~4.0–6.5s (was 19s+ / timeout) |
| Broker account offline | ~1.3–1.5s (was hang / misleading 503) |
| Page SSR (warm) | Dashboard &lt;1s; most screens 2–6s; Orders/Live/Risk first hit 10–23s |

No process memory/CPU profiling beyond request timings. No runaway workers observed in supervisor logs.

---

## 6. Coherence / opportunity validation

| Area | Result |
|------|--------|
| Safety flags | Consistent ANALYSIS_ONLY / no live / read-only across dashboard, live, orders, opportunities |
| Portfolio vs monitor | Both DEMO + **ESTIMATED** after fixes; notes cite TWS offline |
| Research | Engines `CONFIG_REQUIRED` / scores `NO_DATA`; no fake headlines |
| Opportunities | Scanner candidates tagged `priceQuality=DEMO`, badges `DEMO_SYNTHETIC`; graded A+/A filter → empty `opportunities[]` |
| Risk | `monitorLabel=DEMO` aligned with portfolio fallback |
| Committee | Pages load; no order path |
| News / Events | Honest empty / config-required (no fabricated calendar) |
| Scoring | Research overall `NO_DATA` when providers missing |
| Residual mismatch | None for LIVE labeling — disconnected broker uses `UNAVAILABLE` (B7 fixed) |

---

## 7. Remaining backlog (priority)

1. **B8/B9** — Cold-start and offline portfolio latency (cache last-good DEMO faster; optional skip IBKR when `twsReachable=false`).  
2. **B6** — Restart `investment:dev` once so health de-flap script change is live.  
3. Wire Market Intelligence keys for Research/News/Events real data (config, not a code bug).  
4. Re-run Sprint 1 with TWS/Gateway up for live positions/account/buying-power truth check.  
5. Browser console/network pass when MCP browser is available.

---

## 8. Files touched (fixes only)

- `services/ibkr-broker/app/main.py` — TWS preflight, socket reset, offline-safe 503 detail  
- `lib/ibkr/broker-path-map.ts` — error classification  
- `lib/ibkr/service-client.ts` — structured detail parsing  
- `app/api/broker/[...path]/route.ts` — honest proxy errors  
- `app/api/investment/monitor/route.ts` — `dataLabel` + DEMO→ESTIMATED  
- `lib/investment/portfolio-management-snapshot.ts` — metric status after fallback  
- `src/core/investment/infrastructure/portfolio-analytics-provider.ts` — detail object stringify  
- `scripts/investment-dev.js` — health de-flap + TRADING_MODE pin  
- `lib/investment/dashboard-snapshot.ts` / `.types.ts` — B7: disconnected broker → `UNAVAILABLE` (not `IBKR_LIVE_READ_ONLY`)  
- `components/investment/InvestmentProductShell.tsx` / `InvestmentTerminalDashboard.tsx` / `investment-dashboard-widgets.tsx` — honest offline display / no LIVE badge  

---

## 9. Verdict

**SPRINT1_STABLE** — stack runs under ANALYSIS_ONLY with truthful offline IBKR behavior, DEMO/NO_DATA honesty on portfolio/monitor/opportunities/research, and all daily screens SSR-healthy. Remaining issues are medium/low (label nuance, cold latency, MI config). Safe for continued internal use; **not** a live-trading go-ahead (correctly LOCKED).
