/**
 * Client-safe USA regular-session countdown (Europe/Madrid wall clock).
 * Regular close = 22:00 Madrid on weekdays.
 */

export type UsCloseCountdown = {
  phase: "PRE_MARKET" | "REGULAR" | "AFTER_MARKET" | "CLOSED" | "WEEKEND";
  /** ms until next regular close (22:00) while in REGULAR; else until next open/close milestone */
  msRemaining: number;
  label: string;
  targetLabel: string;
};

function madridParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = get("weekday");
  return {
    weekday,
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    nowMinutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Approximate ms until a Madrid wall-clock HH:MM on the same calendar day as `local`. */
function msUntilMadridClock(
  local: ReturnType<typeof madridParts>,
  hour: number,
  minute: number,
  now = new Date(),
): number {
  const targetMinutes = hour * 60 + minute;
  const deltaMinutes = targetMinutes - local.nowMinutes;
  const deltaMs = deltaMinutes * 60_000 - local.second * 1000;
  if (deltaMs >= 0) return deltaMs;
  // next day — coarse +24h (DST edge cases acceptable for UI countdown)
  return deltaMs + 24 * 60 * 60 * 1000;
}

export function getUsCloseCountdown(now = new Date()): UsCloseCountdown {
  const local = madridParts(now);
  const weekend = local.weekday.startsWith("Sat") || local.weekday.startsWith("Sun");
  if (weekend) {
    return {
      phase: "WEEKEND",
      msRemaining: 0,
      label: "Fin de semana",
      targetLabel: "Próxima apertura lun 15:30",
    };
  }

  const { nowMinutes } = local;
  // PRE 09:00–15:29 | REG 15:30–22:00 | AFTER 22:00–01:00 | CLOSED 01:00–09:00
  if (nowMinutes >= 9 * 60 && nowMinutes < 15 * 60 + 30) {
    const ms = msUntilMadridClock(local, 15, 30, now);
    return {
      phase: "PRE_MARKET",
      msRemaining: ms,
      label: formatDuration(ms),
      targetLabel: "Hasta apertura USA",
    };
  }
  if (nowMinutes >= 15 * 60 + 30 && nowMinutes < 22 * 60) {
    const ms = msUntilMadridClock(local, 22, 0, now);
    return {
      phase: "REGULAR",
      msRemaining: ms,
      label: formatDuration(ms),
      targetLabel: "Hasta cierre USA",
    };
  }
  if (nowMinutes >= 22 * 60 || nowMinutes < 60) {
    return {
      phase: "AFTER_MARKET",
      msRemaining: 0,
      label: "Aftermarket",
      targetLabel: "Mercado regular cerrado",
    };
  }
  const ms = msUntilMadridClock(local, 9, 0, now);
  return {
    phase: "CLOSED",
    msRemaining: ms,
    label: formatDuration(ms),
    targetLabel: "Hasta premarket",
  };
}
