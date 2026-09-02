# Strategy Readiness Certification

**Overall result: FAIL** (expectancy gate) / sample incomplete → go-live remains **NOT_READY_FOR_LIVE**

| Field | Value |
| --- | --- |
| Mode | Paper + shadow (NO real orders) |
| Window | `2026-08-03T21:49:02.188Z` → `2026-08-03T21:49:06.368Z` |
| Harness | `npm run certify:strategy-readiness` (`scripts/certify-strategy-readiness.ts`) |
| Evidence | `artifacts/certification/strategy-readiness/` |
| Real orders placed | **0** |
| `placeOrder` invoked | **No** |
| `AUTONOMOUS_LIVE` unlocked | **No** |
| Ready for supervised consideration | **false** |
| Go-live recommendation | **NOT_READY_FOR_LIVE** |
| `TRADING_MODE` | `ANALYSIS_ONLY` |
| `LIVE_TRADING_ENABLED` | **false** |
| `IBKR_READ_ONLY` | **true** |

Do **not** approve on win rate alone. Sessions and expectancy gates block supervised live.

---

## Sample disclosure (honest)

| Source | Count |
| --- | --- |
| Historical paper ledger closed trades | **19** (prior real-anchor cert seed → `.forgeos/registry/paper-trading-state.json`) |
| Real IBKR position `avgCost` anchors (this run) | **19** (single capture window `real-capture-2026-08-03`) |
| Paper closed trades simulated this run | **19** |
| Combined closed trades | **38** (≥30 ✓) |
| Distinct **real** sessions | **1** (need ≥10 ✗) |

LIVE data: IBKR position `avgCost` only (`tws4001=true`, health `ok`, `ibkrReadOnly=true`, `liveTradingEnabled=false`). **No IBKR market-data quote endpoint.** Yahoo/stub providers treated as delayed and **excluded**. Same calendar-day re-run does **not** invent extra sessions. Open orders at probe: `[]`.

Disclosure string from harness:

> Generated 19 paper closed trades from 19 real IBKR position avgCost anchors in a single capture window (`real-capture-2026-08-03`). Distinct real market sessions available from live feed: 1 (not ≥10). No dedicated IBKR market-data quote endpoint; Yahoo/stub providers treated as delayed and excluded.

---

## Performance (combined sample)

| Metric | Value |
| --- | --- |
| Net P&L | **-5.44** (after commissions; starting equity 100000) |
| Win rate | 94.7% (36/38) — **not sufficient alone** |
| Profit factor | 66.53 |
| Expectancy (net of commission) | **-0.143** |
| Sharpe | -0.48 |
| Sortino | -0.56 |
| Max drawdown % | 0.0059 |
| Avg win / avg loss | 0.222 / -0.06 |
| Avg MAE / MFE | 0 / 0 (marks not applied on this path) |
| Avg commission / slippage proxy | 0.35 / 0.35 |
| Avg latency ms | 0 (instant paper fills) |
| % rejected signals | 2.6% (1 delayed-path reject) |
| Shadow evaluations | 19 |
| Regimes covered | trend, sideways, high_vol |
| Duplicate trade IDs | 0 |
| Recon divergences | 0 |

**Interpretation:** High win rate with **negative expectancy** after commissions — commissions dominate small avgCost-based wins. Win rate alone must not unlock live.

---

## Strategy auto-disable

| Strategy | Trades | Expectancy | PF | Decision | Reasons |
| --- | --- | --- | --- | --- | --- |
| `sr-high_vol` | 12 | -0.010 | 34.98 | **DISABLED** | negative_expectancy |
| `sr-sideways` | 12 | -0.166 | n/a (no losses) | **DISABLED** | negative_expectancy |
| `sr-trend` | 14 | -0.237 | n/a (no losses) | **DISABLED** | negative_expectancy |

**Approved strategies: none.** **Rejected/disabled: all three.**

---

## Gates

| ID | Gate | Status | Actual |
| --- | --- | --- | --- |
| SR01 | ≥30 closed trades | **PASS** | 38 |
| SR02 | ≥10 distinct real sessions | **NOT_READY** | 1 |
| SR03 | Regimes trend/sideways/high_vol | **PASS** | all three |
| SR04 | Spread, slippage, commissions | **PASS** | applied |
| SR05 | No delayed-data trades | **PASS** | 0 |
| SR06 | No trade without stop | **PASS** | mandatory stops on sim path |
| SR07 | No trade outside limits | **PASS** | 0 |
| SR08 | Positive net expectancy | **FAIL** | -0.143 |
| SR09 | PF > 1.10 | **PASS** | 66.53 |
| SR10 | Max DD ≤ 15% | **PASS** | 0.0059% |
| SR11 | Recon / open orders clean | **PASS** | `[]` |
| SR12 | Zero real / duplicate orders | **PASS** | 0 |

---

## Gaps (blocking)

1. Need ≥10 distinct real sessions; have **1**. Cannot invent sessions without a live quote feed across multiple trading days.
2. Expectancy after commissions is **negative** (−0.143) — SR08 **FAIL**.
3. All strategies auto-disabled for negative expectancy — zero approved strategies.

Optional next steps (still no live unlock):

- Add IBKR market-data route with freshness SLA; accumulate paper/shadow across ≥10 real sessions.
- Re-tune strategy economics so net expectancy survives spread/slippage/commission; re-run until SR01+SR02+SR08+SR09+SR10 pass with ≥1 APPROVED strategy.

---

## Verdict

**NOT_READY_FOR_LIVE** from strategy readiness.

Flags unchanged. Zero real orders. Zero duplicate orders. Zero recon divergences.
