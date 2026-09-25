# FORGEOS INVESTMENT — Product Map

Independent Investment Operating System inside ForgeOS.

**Safety (non-negotiable):** `ANALYSIS_ONLY` · `LIVE_TRADING_ENABLED=false` · `IBKR_READ_ONLY=true` · `AUTONOMOUS_LIVE=LOCKED` · **zero real orders**.

## Entry points

| Surface | Path |
| --- | --- |
| Product overview | `/investment` |
| ForgeOS OS home card | `/os` → FORGEOS INVESTMENT card |
| Main sidebar | PRINCIPAL → **INVESTMENT** (always expanded) |
| OS sidebar | pinned **INVESTMENT** → `/investment` |
| Command palette | `FORGEOS INVESTMENT` |

## Module map

| Module | Route | Backend (reuse) | Status |
| --- | --- | --- | --- |
| Overview | `/investment` | Dashboard snapshot + portfolio monitor | Live widgets |
| Broker | `/investment/broker` | Broker Adapter / IBKR read-only terminal | Live |
| Portfolio | `/investment/portfolio` | Portfolio Analytics / monitor | Live + shell |
| Markets | `/investment/markets` | Market Intelligence provider registry | Wired status |
| Screener | `/investment/screener` | Market Intelligence `gather()` | Wired (empty if no keys) |
| Research | `/investment/research` | MI news/economic/sentiment providers | Wired status |
| Opportunities | `/investment/opportunities` | Opportunity Scanner | Live |
| Signals | `/investment/signals` | Investment Brain snapshot | Live widgets |
| Committee | `/investment/committee` | Committee summary + decisions | Live widgets |
| Risk | `/investment/risk` | Risk Engine snapshot | Live widgets |
| Strategy Center | `/investment/strategy` | Strategy Engine + enable/disable + DEMO ops | Wired |
| Strategy Lab | `/investment/strategy-lab` | Lab metrics, cert, versioning, MC/optimizer/AI — composes engines | Wired |
| Market Scanner | `/investment/scanner` | Continuous analysis → committee → scanner rows | Wired |
| Alpha Engine | `/investment/alpha` | Discover/score/prioritize; A+/A → Committee+Risk analysis | Wired |
| Backtesting | `/investment/backtesting` | Strategy Engine DEMO/MI walk | Wired |
| Paper Trading | `/investment/paper` | Paper Trading orchestrator | Live |
| Shadow Trading | `/investment/shadow` | Shadow / memory | Live |
| Live Trading | `/investment/live` | Autonomous Live (LOCKED) | Live read-only |
| Performance | `/investment/performance` | Paper equity + shadow P&L + attribution | Wired + lazy chart |
| Paper vs Shadow | `/investment/compare` | Paper trades + shadow memory diffs | Wired |
| Audit | `/investment/audit` | Investment Memory timeline | Wired |
| AI Lab | `/investment/ai-lab` | Brain + Committee + providers | Live widgets |
| Settings | `/investment/settings` | Safety flags + MI health + key presence | Wired |

## APIs (read-only)

- `/api/investment/dashboard` — overview snapshot
- `/api/investment/monitor` — portfolio monitor
- `/api/investment/opportunities` — opportunity scanner
- `/api/investment/live` — live control snapshot (LOCKED)
- `/api/investment/market-intelligence` — MI provider registry status
- `/api/investment/screener` — MI gather for symbols
- `/api/investment/strategies` — Strategy Engine catalog
- `/api/investment/strategies/evaluate` — offline DEMO evaluation
- `/api/investment/strategy-center` — Strategy Center enable/disable
- `/api/investment/strategy-lab` — Strategy Lab snapshot + lab versioning (no production mutation)
- `/api/investment/alpha-engine` — Alpha Engine snapshot (ordersSubmitted=0)
- `/api/investment/audit` — Investment Memory timeline
- `/api/investment/probe-gather` — Settings MI probe (counts only, no secrets)
- `/api/broker/*` — IBKR proxies (unchanged connection core)

## Asset classes (analysis)

stocks · ETF · forex · futures · options · bonds · commodities · indices  
Trade gate: **NO_TRADE** when market data is DELAYED or STALE.

## Market Intelligence providers

Configured only when env keys/flags exist (never invented): Alpha Vantage, Polygon, Finnhub (market + company-news + sentiment), FMP, Twelve Data, NewsAPI, FRED, ECB, Yahoo Finance, RSS.

**HTTP fetchers (live quotes only with keys/flags):** Polygon, Finnhub, Alpha Vantage, FMP, Twelve Data, Yahoo Finance (flag). News: NewsAPI, Finnhub company-news, Polygon news, FMP stock news, Alpha Vantage NEWS_SENTIMENT headlines, Yahoo, RSS. FRED, ECB (flag). Vendor sentiment: Finnhub news-sentiment + Alpha Vantage NEWS_SENTIMENT; NewsAPI/RSS keep labeled headline heuristics as supplemental. Benchmarks: `FORGEOS_BENCHMARK_SYMBOL` + optional `FORGEOS_BENCHMARK_SYMBOLS` for multi-benchmark beta/alpha/corr/TE/IR.

**IBKR market-data:** FastAPI exposes GET `/api/ibkr/history` (read-only `reqHistoricalData`). Capability status **READ_ONLY_ROUTE**. Empty bars = TWS subscription/timeout — never invented. Streaming quotes still missing.

## Done (recent)

1–35. Prior Investment OS polish through vendor news providers
36. IBKR read-only history FastAPI route (`reqHistoricalData`, no placeOrder / no flag flips)
37. Session evidence ledger + paper/shadow distinct-session sample gates (honest NOT_READY)
38. LIVE UI: harness gates table + blocked human GO_LIVE control
39. World Bank + Alpha Vantage economic providers (env-gated)
40. GO_LIVE unlock UI remains disabled; never sets LIVE_TRADING_ENABLED
41. Strategy Lab — quantitative research hub (metrics, cert, versioning, MC/optimizer/AI, memory)
42. Alpha Engine — opportunity discovery/scoring; A+/A committee+risk escalation (no orders)

## Next backlog

1. Validate IBKR history end-to-end against live TWS market-data subscriptions
2. Grow real multi-session paper/shadow evidence toward sample PASS (still NOT_READY_FOR_LIVE)
3. Feed paper/shadow closed trades into Strategy Lab metrics (partial: paper source wired; expand attribution)
4. Wire Alpha post-trade reviews to live paper close events automatically
5. Optional supervised certification review workflow (human ops, not auto-unlock)
6. Additional alt-data providers when keys exist
7. Streaming IBKR quotes only if a safe read-only path is available
