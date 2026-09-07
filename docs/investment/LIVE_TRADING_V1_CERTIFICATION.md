# ForgeOS Live Trading v1 — Supervised LOCKED Certification

**Overall result: PASS**

| Field | Value |
| --- | --- |
| Mode | `SUPERVISED_LOCKED` / `ANALYSIS_ONLY` |
| Certification window | `2026-08-03T21:18:16.978Z` → `2026-08-03T21:18:18.992Z` |
| Harness | `npm run certify:live-trading-v1` (`scripts/certify-live-trading-v1.ts`) |
| Machine evidence | `artifacts/certification/live-trading-v1/certification-results.json` |
| Real orders placed | **0** |
| `placeOrder` invoked | **No** |
| Execute endpoint attempts | 3 (all HTTP **423** blocked) |
| `LIVE_TRADING_ENABLED` | **false** (unchanged) |
| `IBKR_READ_ONLY` | **true** (unchanged) |

This certification authorizes **read-only / proposal / approval / block** paths only. It does **not** authorize live order submission.

---

## Preconditions

| Check | Result | Evidence |
| --- | --- | --- |
| TWS / Gateway port 4001 | PASS | TCP connect succeeded |
| IBKR FastAPI `:8000` | PASS | `/health` → `ok: true` |
| ForgeOS `:3000` | PASS | `/investment` HTTP 200 |
| Real account detected | PASS | Managed accounts `U15513057`, `U24225949` |
| `nextValidId` | PASS | `nextValidId=1`, `nextOrderIdReady=true` |
| Account summary | PASS | NetLiquidation / AvailableFunds / BuyingPower returned (EUR) |
| Positions | PASS | Live positions with `conId` (e.g. GNLN `870512079`) |
| Open orders | PASS | `[]` before and after certification |
| Market data route | PARTIAL | No dedicated FastAPI market-data endpoint; freshness enforced in LOCKED gate |
| Resolvable contract | PASS | Position `conId` evidence + allowlist risk checks for AAPL/MSFT |
| Risk Engine | PASS | `evaluate_risk` on proposal create |
| Approval flow | PASS | `POST /api/proposals/{id}/decision` |
| Audit | PASS | `audit_log` events on proposal/control |
| Emergency stop | PASS | `POST /api/control/emergency-stop` |
| Cancel order | PARTIAL | Simulated cancel-all only (no live `cancelOrder`) |
| Reconciliation | PASS | Order book snapshot compare |
| What-If | PARTIAL capability | LOCKED scaffolding What-If + proposal `risk_checks` (no IBKR what-if route) |
| Configured limits | PASS | See Limits |

Node runtime hint used: `C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node` (Node v22.16.0).

---

## Tests (14/14 PASS)

| ID | Test | Status | Notes |
| --- | --- | --- | --- |
| T01 | Real account READ_ONLY | **PASS** | Health: `ibkrReadOnly=true`, `liveTradingEnabled=false`; real `U*` accounts |
| T02 | Create proposal (1 share / ≤100 notional) | **PASS** | AAPL BUY 1 @ 50 → notional 50, status `PENDING` (`1bd530ea-…`) |
| T03 | Run What-If | **PASS** | LOCKED What-If estimatedNotional=50; proposal risk_checks all passed |
| T04 | Approve proposal | **PASS** | Status `APPROVED`, approval token issued |
| T05 | Verify execution BLOCKED | **PASS** | `POST /execute` → **423** `LIVE_TRADING_ENABLED está desactivado`; proposal remained `APPROVED` (not `EXECUTED`) |
| T06 | Test expiry | **PASS** | Force-expired proposal → approve returns **409** `La propuesta ha caducado` |
| T07 | Double execution / idempotency | **PASS** | Second `/execute` also **423**; open orders still `[]` |
| T08 | Disallowed symbol | **PASS** | TSLA → status `BLOCKED` (`symbol_allowlist` failed) |
| T09 | Excessive notional | **PASS** | 2×200=400 > 250 → `BLOCKED` (`notional_limit` failed) |
| T10 | Stale data | **PASS** | LOCKED gate rejected ageMs=3600000 (max 15000) |
| T11 | IBKR disconnected | **PASS** | LOCKED gate blocks when `brokerConnected=false` (live disconnect not forced; session stayed up) |
| T12 | Emergency stop | **PASS** | Stop enabled → execute **423** `Parada de emergencia`; then restored `emergencyStop=false` |
| T13 | Simulated cancellation | **PASS** | `CANCEL_ALL_TRIGGERED` audit with `placeOrderInvoked=false` |
| T14 | Reconciliation | **PASS** | Orders `[]`→`[]` unchanged; no certification proposal marked `EXECUTED` |

Unit scaffolding also covered by Vitest:

- `src/core/investment/live-execution/locked-gate.test.ts` — 9/9 PASS
- `src/core/investment/live-execution/live-execution-engine.test.ts` — 8/8 PASS

---

## Limits

| Limit | Value | Source |
| --- | --- | --- |
| `IBKR_READ_ONLY` | `true` | `services/ibkr-broker/.env` |
| `LIVE_TRADING_ENABLED` | `false` | `services/ibkr-broker/.env` |
| Max order notional | `250` | broker service |
| Max order quantity | `2` | broker service |
| Allowed symbols | `AAPL,MSFT` | broker service |
| Allowed currencies | `EUR,USD` | broker service |
| Allowed exchanges | `SMART` | broker service |
| Proposal TTL | `600s` | broker service |
| LOCKED cert max notional | `100` | `DEFAULT_LOCKED_RESTRICTIONS` |
| LOCKED cert max risk / trade | `20` | `DEFAULT_LOCKED_RESTRICTIONS` |
| LOCKED price freshness | `15_000 ms` | `DEFAULT_LOCKED_RESTRICTIONS` |
| Order type | `LMT` only | risk engine + LOCKED gate |
| Asset class | Equity / STK | v1 restriction |
| Session | Regular hours | v1 restriction |
| Leverage | `1` | v1 restriction |

---

## Errors

No harness-level errors were recorded (`errors: []` in results JSON).

Observed IBKR informational connectivity codes during status (non-fatal): `2107` (HMDS on-demand), intermittent `2157`/`2158` sec-def farm notices, and prior reconnect history (`1100`/`1102`). Session was connected at certification time.

---

## Risks

1. **Flag flip risk** — Real accounts are connected. Setting `LIVE_TRADING_ENABLED=true` and `IBKR_READ_ONLY=false` would unlock `/execute` → `placeOrder`.
2. **Incomplete market-data / cancel surfaces** — No dedicated FastAPI market-data, contract-details, or live `cancelOrder` routes; freshness and cancel were certified via LOCKED scaffolding / emergency stop.
3. **HMDS intermittency** — Historical data farm may be inactive; does not block account/position reads but may affect future pricing features.
4. **Low buying power** — Account available funds are small (tens of EUR). Even after a future unlock, capital risk remains material relative to notional caps.
5. **Approved proposals remain in DB** — Certification left an `APPROVED` proposal blocked only by flags; do not unlock flags while such proposals exist without review.

---

## Rollback

1. Confirm flags remain:
   - `LIVE_TRADING_ENABLED=false`
   - `IBKR_READ_ONLY=true`
2. If anything looks wrong: `POST /api/control/emergency-stop?enabled=true`.
3. Do not call `/api/proposals/{id}/execute`.
4. Reject leftover `APPROVED` / `PENDING` certification proposals via decision API.
5. Stop FastAPI (`uvicorn`) and/or disconnect TWS API clients.
6. Re-run `npm run certify:live-trading-v1` after any config change before considering another unlock review.

Post-cert health recheck:

```json
{"ok":true,"liveTradingEnabled":false,"ibkrReadOnly":true,"emergencyStop":false}
```

Open orders recheck: `[]`.

---

## Manual checklist (operator)

- [ ] TWS / IB Gateway logged in; API socket on **4001**
- [ ] FastAPI broker on **8000**; ForgeOS on **3000**
- [ ] Confirm `.env`: `IBKR_READ_ONLY=true`, `LIVE_TRADING_ENABLED=false`
- [ ] Open `/broker` or `/investment` and confirm ANALYSIS_ONLY / read-only badges
- [ ] Connect IBKR; verify managed accounts, summary, positions, empty open orders
- [ ] Create ≤1 share / ≤100 notional proposal on allowlisted symbol
- [ ] Review risk_checks / What-If estimates
- [ ] Approve with exact confirmation phrase
- [ ] Attempt execute only to confirm **423 blocked** (do not change flags)
- [ ] Exercise emergency stop, then disable it again
- [ ] Confirm open orders still empty and no unexpected fills in TWS
- [ ] Archive `artifacts/certification/live-trading-v1/certification-results.json`

---

## Go-live recommendation

**DO NOT GO LIVE.**

ForgeOS is certified for **first supervised, limited real operation in LOCKED / ANALYSIS_ONLY mode only**:

- Real account **read** connectivity: certified
- Proposal → What-If/risk → Approve → **execution blocked**: certified
- Safety rails (allowlist, notional, expiry, emergency stop, reconciliation): certified
- Live order submission: **not authorized**

### Required before any future unlock review

1. Dedicated market-data + contract resolution endpoints with freshness SLAs
2. Live cancel-order path tested in paper or carefully supervised unlock dry-run
3. Explicit operator dual-control checklist signed for flag changes
4. Lower initial live caps (recommend ≤100 notional, 1 share, single symbol) if unlock is ever approved
5. Re-run this certification harness immediately before and after any flag change
6. Keep emergency stop rehearsed and reachable

Until then, keep:

```env
IBKR_READ_ONLY=true
LIVE_TRADING_ENABLED=false
```

---

## Files created / modified for this certification

| Path | Role |
| --- | --- |
| `docs/investment/LIVE_TRADING_V1_CERTIFICATION.md` | This report |
| `scripts/certify-live-trading-v1.ts` | Automated LOCKED certification harness |
| `src/core/investment/live-execution/locked-gate.ts` | SUPERVISED_LOCKED pipeline (never submits) |
| `src/core/investment/live-execution/locked-gate.test.ts` | Unit coverage for LOCKED gate |
| `src/core/investment/live-execution/memory-storage.ts` | Client-safe in-memory storage (no `server-only`) |
| `src/core/investment/live-execution/infrastructure.ts` | File storage kept server-only; re-exports memory store |
| `src/core/investment/live-execution/index.ts` | Barrel exports |
| `package.json` | Added `certify:live-trading-v1` |
| `artifacts/certification/live-trading-v1/certification-results.json` | Machine-readable evidence |
