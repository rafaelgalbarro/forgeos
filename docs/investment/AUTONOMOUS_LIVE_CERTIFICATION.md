# AUTONOMOUS_LIVE Certification Checklist

**Overall recommendation: DO NOT UNLOCK**

Status: **LOCKED / NOT READY TO UNLOCK**

This document gates any future unlock of `TRADING_MODE=AUTONOMOUS_LIVE` with real order submission.
Related supervised certification: [`LIVE_TRADING_V1_CERTIFICATION.md`](./LIVE_TRADING_V1_CERTIFICATION.md).

If sibling docs appear (`LIVE_EXECUTION_OPERATIONAL`, `STRATEGY_READINESS`, `GO_LIVE_DECISION`), treat them as complementary gates — **all must PASS** before unlock.

## Current safety flags (must remain)

| Flag | Required | Current |
|------|----------|---------|
| `TRADING_MODE` | `ANALYSIS_ONLY` (or non-autonomous default) | **ANALYSIS_ONLY** (`.env.example`) |
| `LIVE_TRADING_ENABLED` | `false` | **false** |
| `IBKR_READ_ONLY` | `true` | **true** |
| AUTONOMOUS_LIVE lock | `LOCKED` | **LOCKED** |
| Real orders | Zero | **Zero** (`ordersSubmitted=0`) |

## Architecture gates

| ID | Gate | Status | Notes |
|----|------|--------|-------|
| A01 | Full pipeline stages present (no skip) | **PASS** | `AUTONOMOUS_LIVE_PIPELINE_STAGES` in `src/core/investment/autonomous-live/` |
| A02 | Only `LiveExecutionEngine` may submit orders | **PASS** | Boundary lint + IBKR submit gate |
| A03 | Strategies/agents never call broker submit | **PASS** | Ensemble/analysis/overlay have no broker write |
| A04 | Data quality meta on every datum | **PASS** | `MarketDatumMeta` + adapters |
| A05 | Delayed ≠ live; delayed → NO_TRADE | **PASS** | `data-quality` + analysis loop |
| A06 | Ensemble consensus required | **PASS** | Multi-strategy; dissent recorded |
| A07 | Initial real limits wired | **PASS** | `limits.ts` / `.env.example` |
| A08 | Limits auto-tighten only | **PASS** | `tightenLimits` / `assertLimitsNotWidened` |
| A09 | Entry validations → NO_TRADE | **PASS** | `guards.validateEntry` |
| A10 | Exit priority over entries | **PASS** | `selectExitsOverEntries` |
| A11 | Circuit breakers → HALT_SYSTEM | **PASS** | Human unlock required |
| A12 | Learning export without auto-prod mutate | **PASS** | `memory-attribution` |
| A13 | UI `/investment/live` OS control center | **PASS** | Nav label **LIVE**; locked banner |
| A14 | IBKR read-only integration | **PARTIAL** | Health/status/orders/positions via BrokerEngine; live quote universe still UNKNOWN until feed wired |
| A15 | Paper certification complete | **FAIL** | Not certified |
| A16 | Shadow certification complete | **FAIL** | Not certified |
| A17 | Walk-forward + approval for strategies | **FAIL** | Not completed |
| A18 | Human unlock procedure rehearsed | **FAIL** | Must not unlock yet |
| A19 | Operational runbook / go-live decision | **FAIL** | Await sibling certification docs |
| A20 | Zero unintended orders in certification window | **PASS** (so far) | Locked path never submits |

## Unlock prerequisites (all required)

1. All gates A01–A20 **PASS**
2. Explicit human dual-approval recorded
3. Capital at risk acknowledged
4. Emergency halt drill completed
5. `LIVE_TRADING_ENABLED=true` and `IBKR_READ_ONLY=false` only after the above — **not in this change set**

## Recommendation

**DO NOT UNLOCK.**

AUTONOMOUS_LIVE scaffolding and Investment OS control center are in place for analysis and defensive overlays only. Keep:

```
TRADING_MODE=ANALYSIS_ONLY
LIVE_TRADING_ENABLED=false
IBKR_READ_ONLY=true
```

No return promises. Objective remains risk-adjusted decision quality and loss limitation under strict audit.
