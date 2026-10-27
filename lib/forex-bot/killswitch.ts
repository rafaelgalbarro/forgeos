/**
 * Live kill switch: a confirmed strategy is sent back to simulation (no real orders) when its
 * REAL results diverge clearly from the backtest:
 *   - 4 consecutive real losses, or
 *   - cumulative real result ≤ −4 R over its last 8 real trades.
 * It comes back automatically when its SIMULATED trades since the demotion add up to ≥ +2 R
 * (it keeps trading in simulation meanwhile). Pure: works on the trade journal.
 */

import type { FxTrade } from "./types";

export const KILL = { maxConsecutiveLosses: 4, window: 8, minWindowR: -4, revivalR: 2 } as const;

export function killSwitchState(trades: readonly FxTrade[], strategy: string): { demoted: boolean; reason: string | null; since: string | null } {
  const real = trades.filter((t) => t.strategy === strategy && t.mode !== "shadow" && t.closedAt && t.rMultiple != null)
    .sort((a, b) => Date.parse(a.closedAt!) - Date.parse(b.closedAt!));
  if (!real.length) return { demoted: false, reason: null, since: null };
  let consec = 0;
  for (let i = real.length - 1; i >= 0 && real[i]!.rMultiple! <= 0; i -= 1) consec += 1;
  const lastW = real.slice(-KILL.window);
  const sumW = lastW.reduce((s, t) => s + t.rMultiple!, 0);
  let reason: string | null = null;
  if (consec >= KILL.maxConsecutiveLosses) reason = `${consec} pérdidas reales seguidas`;
  else if (lastW.length >= 4 && sumW <= KILL.minWindowR) reason = `${sumW.toFixed(1)} R en las últimas ${lastW.length} reales`;
  if (!reason) return { demoted: false, reason: null, since: null };
  const since = real[real.length - 1]!.closedAt!;
  // Revival: simulated trades after the demotion point
  const simR = trades.filter((t) => t.strategy === strategy && t.mode === "shadow" && t.closedAt && Date.parse(t.openedAt) > Date.parse(since) && t.rMultiple != null)
    .reduce((s, t) => s + t.rMultiple!, 0);
  if (simR >= KILL.revivalR) return { demoted: false, reason: null, since };
  return { demoted: true, reason, since };
}
