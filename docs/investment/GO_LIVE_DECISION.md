# Go-Live Decision — ForgeOS Live Trading V1

## Decision

**NOT_READY_FOR_LIVE**

---

## Inputs (evidence-based)

| Certification | Result | Path |
| --- | --- | --- |
| Prior V1 LOCKED (14/14) | **PASS** | `docs/investment/LIVE_TRADING_V1_CERTIFICATION.md` |
| A. Live Execution Operational | **PASS** (22/22) | `docs/investment/LIVE_EXECUTION_OPERATIONAL_CERTIFICATION.md` |
| B. Strategy Readiness | **FAIL / NOT_READY** | `docs/investment/STRATEGY_READINESS_CERTIFICATION.md` |

Machine evidence:

- `artifacts/certification/live-trading-v1/certification-results.json`
- `artifacts/certification/live-execution-operational/certification-results.json`
- `artifacts/certification/strategy-readiness/certification-results.json`
- `artifacts/certification/strategy-readiness/strategy-verdicts.json`

---

## Rationale

1. **LOCKED / operational rails are healthy** — supervised locked path and paper operational mechanics certified with **zero real orders**.
2. **Strategy sample fails go-live gates** — combined paper ledger has **38** closed trades (sample size ok) but only **1** distinct real session (need ≥10). Net expectancy after commissions is **negative (−0.143)** despite ~95% win rate. All three regime strategies (`sr-trend`, `sr-sideways`, `sr-high_vol`) were **auto-disabled**. No IBKR live quote route — only position `avgCost` anchors; delayed/Yahoo stubs excluded.
3. **No AUTONOMOUS_LIVE** — this decision path never recommends autonomous live. Even a future positive strategy cert would only open review for **supervised** live, not autonomy.

Therefore the only admissible decision value is:

```
NOT_READY_FOR_LIVE
```

`READY_FOR_SUPERVISED_LIVE` is **not** warranted until Strategy Readiness overall = PASS with SR01, SR02, positive expectancy, PF > 1.10, DD within limit, ≥1 approved strategy, and no critical failures — then re-issue this document.

---

## Final state confirmation

| Control | Required | Observed |
| --- | --- | --- |
| `TRADING_MODE` | `ANALYSIS_ONLY` | `ANALYSIS_ONLY` |
| `LIVE_TRADING_ENABLED` | `false` | `false` (process + `services/ibkr-broker/.env`) |
| `IBKR_READ_ONLY` | `true` | `true` (process + disk) |
| Real orders placed | 0 | **0** |
| `placeOrder` invoked | No | **No** |
| `AUTONOMOUS_LIVE` unlocked | No | **No** |
| Limits / circuit breakers modified | No | **No** |

---

## What this does **not** authorize

- Real order submission
- Flag flips (`LIVE_TRADING_ENABLED=true` / `IBKR_READ_ONLY=false`)
- Supervised live trading
- Autonomous live trading

Keep emergency-stop rehearsed. Re-run operational + strategy harnesses after any material change before reconsidering go-live.
