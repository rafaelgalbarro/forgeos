export type ExchangeCode =
  | "SMART"
  | "LSE"
  | "XETRA"
  | "AEB"
  | "TSE"
  | "HKEX"
  | "ASX"
  | "EURONEXT"
  | "CPH"

/** US listing venues — horario USA (NYSE/NASDAQ/ETFs). */
export const US_LISTING_EXCHANGES = new Set([
  "SMART",
  "NYSE",
  "NASDAQ",
  "ARCA",
  "BATS",
  "ISLAND",
])

type ExchangeSession = {
  exchange: ExchangeCode
  timeZone: string
  openHour: number
  openMinute: number
  closeHour: number
  closeMinute: number
}

const EXCHANGE_SESSIONS: Record<ExchangeCode, ExchangeSession | null> = {
  SMART: null,
  LSE: { exchange: "LSE", timeZone: "Europe/London", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  XETRA: { exchange: "XETRA", timeZone: "Europe/Berlin", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  AEB: { exchange: "AEB", timeZone: "Europe/Amsterdam", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  TSE: { exchange: "TSE", timeZone: "Asia/Tokyo", openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 30 },
  HKEX: { exchange: "HKEX", timeZone: "Asia/Hong_Kong", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0 },
  ASX: { exchange: "ASX", timeZone: "Australia/Sydney", openHour: 10, openMinute: 0, closeHour: 16, closeMinute: 0 },
  EURONEXT: { exchange: "EURONEXT", timeZone: "Europe/Paris", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30 },
  CPH: { exchange: "CPH", timeZone: "Europe/Copenhagen", openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 0 },
}

type ListingProfile = {
  /** Bolsa europea nativa (cuando existe listing dual). */
  nativeExchange?: ExchangeCode
  /** Tiene ADR/ETF en USA — horario USA cuando se cotiza por NYSE/NASDAQ/SMART. */
  usListing: boolean
  /** Solo cotiza en Europa (sin ADR USA). */
  europeOnly?: boolean
}

/**
 * Perfiles de listing dual (ADR USA + nativo EU) o solo europeo.
 * getMarketSessionInfo sin quoteExchange asume ADR USA para dual-listed.
 */
const LISTING_PROFILES: Record<string, ListingProfile> = {
  // Dual-listed — ADR USA + nativo EU
  ASML: { nativeExchange: "AEB", usListing: true },
  SAP: { nativeExchange: "XETRA", usListing: true },
  SHEL: { nativeExchange: "LSE", usListing: true },
  BP: { nativeExchange: "LSE", usListing: true },
  // ETFs USA
  EZU: { usListing: true },
  VGK: { usListing: true },
}

const IBKR_TO_SESSION: Record<string, ExchangeCode> = {
  LSE: "LSE",
  XETRA: "XETRA",
  AEB: "AEB",
  TSE: "TSE",
  HKEX: "HKEX",
  ASX: "ASX",
  EURONEXT: "EURONEXT",
  SBF: "EURONEXT",
  PAR: "EURONEXT",
  CPH: "CPH",
  OMXC: "CPH",
}

export type UsMarketSessionPhase = "PRE_MARKET" | "REGULAR" | "AFTER_MARKET" | "CLOSED"

export type UsMarketSession = {
  phase: UsMarketSessionPhase
  timeZone: string
  localTime: string
  sessionLabel: string
  isTradeable: boolean
  isExtendedHours: boolean
}

export type MarketSessionInfo = {
  ticker: string
  exchange: ExchangeCode
  timeZone: string
  sessionLabel: string
  localTime: string
  isOpenNow: boolean
  listingNote?: string
  usPhase?: UsMarketSessionPhase
}

/** Sesiones USA referenciadas en hora española (Europe/Madrid). */
const US_SESSION_SPAIN = {
  timeZone: "Europe/Madrid",
  preMarket: { startH: 9, startM: 0, endH: 15, endM: 29 },
  regular: { startH: 15, startM: 30, endH: 22, endM: 0 },
  afterMarket: { startH: 22, startM: 0, endH: 1, endM: 0 },
  closed: { startH: 1, startM: 0, endH: 9, endM: 0 },
} as const

function toMadridParts() {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: US_SESSION_SPAIN.timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon"
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0")
  return {
    weekday,
    hour,
    minute,
    localTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    nowMinutes: hour * 60 + minute,
  }
}

function inMinuteRange(nowMinutes: number, startH: number, startM: number, endH: number, endM: number): boolean {
  const start = startH * 60 + startM
  const end = endH * 60 + endM
  if (start <= end) return nowMinutes >= start && nowMinutes < end
  // Rango nocturno (ej. 22:00 → 01:00)
  return nowMinutes >= start || nowMinutes < end
}

/**
 * Sesión USA en hora española:
 * PRE_MARKET 09:00-15:29 | REGULAR 15:30-22:00 | AFTER_MARKET 22:00-01:00 | CLOSED 01:00-09:00
 */
export function getUsMarketSession(): UsMarketSession {
  const local = toMadridParts()
  const weekday = local.weekday.toLowerCase()
  const isWeekend = weekday.startsWith("sat") || weekday.startsWith("sun")
  const { nowMinutes, localTime } = local
  const tz = US_SESSION_SPAIN.timeZone

  if (isWeekend) {
    return {
      phase: "CLOSED",
      timeZone: tz,
      localTime,
      sessionLabel: "Fin de semana",
      isTradeable: false,
      isExtendedHours: false,
    }
  }

  const { preMarket, regular, afterMarket, closed } = US_SESSION_SPAIN

  if (inMinuteRange(nowMinutes, preMarket.startH, preMarket.startM, preMarket.endH, preMarket.endM + 1)) {
    return {
      phase: "PRE_MARKET",
      timeZone: tz,
      localTime,
      sessionLabel: "09:00-15:29 (premarket USA)",
      isTradeable: true,
      isExtendedHours: true,
    }
  }
  if (inMinuteRange(nowMinutes, regular.startH, regular.startM, regular.endH, regular.endM)) {
    return {
      phase: "REGULAR",
      timeZone: tz,
      localTime,
      sessionLabel: "15:30-22:00 (mercado regular USA)",
      isTradeable: true,
      isExtendedHours: false,
    }
  }
  if (inMinuteRange(nowMinutes, afterMarket.startH, afterMarket.startM, afterMarket.endH, afterMarket.endM)) {
    return {
      phase: "AFTER_MARKET",
      timeZone: tz,
      localTime,
      sessionLabel: "22:00-01:00 (aftermarket USA)",
      isTradeable: true,
      isExtendedHours: true,
    }
  }
  if (inMinuteRange(nowMinutes, closed.startH, closed.startM, closed.endH, closed.endM)) {
    return {
      phase: "CLOSED",
      timeZone: tz,
      localTime,
      sessionLabel: "01:00-09:00 (mercado cerrado)",
      isTradeable: false,
      isExtendedHours: false,
    }
  }

  return {
    phase: "CLOSED",
    timeZone: tz,
    localTime,
    sessionLabel: "Fuera de sesión",
    isTradeable: false,
    isExtendedHours: false,
  }
}

export function isUsMarketTradeable(): boolean {
  return getUsMarketSession().isTradeable
}

function toLocalParts(timeZone: string) {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon"
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0")
  return { weekday, hour, minute, localTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` }
}

function resolveSessionCode(exchange: string, ticker: string): ExchangeCode | null {
  const upper = exchange.trim().toUpperCase()
  if (US_LISTING_EXCHANGES.has(upper)) return null
  if (upper in IBKR_TO_SESSION) return IBKR_TO_SESSION[upper]!
  return inferNativeExchange(ticker)
}

function inferNativeExchange(ticker: string): ExchangeCode {
  const upper = ticker.trim().toUpperCase()
  const profile = LISTING_PROFILES[upper]
  if (profile?.nativeExchange) return profile.nativeExchange
  if (upper.endsWith(".HK")) return "HKEX"
  if (upper.endsWith(".T")) return "TSE"
  if (upper.endsWith(".AX")) return "ASX"
  return "SMART"
}

export function isUsListingExchange(exchange: string): boolean {
  return US_LISTING_EXCHANGES.has(exchange.trim().toUpperCase())
}

export function getMarketSessionForExchange(
  exchange: ExchangeCode | string,
  ticker: string,
): MarketSessionInfo | null {
  const code = resolveSessionCode(String(exchange), ticker)
  if (!code) return null

  const session = EXCHANGE_SESSIONS[code]
  if (!session) return null

  const local = toLocalParts(session.timeZone)
  const weekday = local.weekday.toLowerCase()
  const isWeekend = weekday.startsWith("sat") || weekday.startsWith("sun")
  const nowMinutes = local.hour * 60 + local.minute
  const openMinutes = session.openHour * 60 + session.openMinute
  const closeMinutes = session.closeHour * 60 + session.closeMinute
  const isOpenNow = !isWeekend && nowMinutes >= openMinutes && nowMinutes <= closeMinutes

  const profile = LISTING_PROFILES[ticker.trim().toUpperCase()]
  const listingNote = profile?.usListing && isUsListingExchange(String(exchange))
    ? "ADR/ETF USA"
    : profile?.europeOnly
      ? "Solo mercado europeo"
      : profile?.nativeExchange
        ? `Nativo ${profile.nativeExchange}`
        : undefined

  return {
    ticker: ticker.toUpperCase(),
    exchange: code,
    timeZone: session.timeZone,
    sessionLabel: `${String(session.openHour).padStart(2, "0")}:${String(session.openMinute).padStart(2, "0")}-${String(session.closeHour).padStart(2, "0")}:${String(session.closeMinute).padStart(2, "0")}`,
    localTime: local.localTime,
    isOpenNow,
    listingNote,
  }
}

/**
 * Sesión de mercado para un ticker.
 * Sin quoteExchange: dual-listed usa horario USA (ADR); europeOnly usa bolsa nativa.
 * Con quoteExchange: respeta la ruta de cotización (NASDAQ → USA, XETRA → EU, etc.).
 */
export function getMarketSessionInfo(
  ticker: string,
  options?: { quoteExchange?: string },
): MarketSessionInfo | null {
  const upper = ticker.trim().toUpperCase()
  const profile = LISTING_PROFILES[upper]

  if (options?.quoteExchange) {
    return getMarketSessionForExchange(options.quoteExchange, ticker)
  }

  if (profile?.europeOnly && profile.nativeExchange) {
    return getMarketSessionForExchange(profile.nativeExchange, ticker)
  }

  if (profile?.usListing) {
    const us = getUsMarketSession()
    return {
      ticker: upper,
      exchange: "SMART",
      timeZone: us.timeZone,
      sessionLabel: us.sessionLabel,
      localTime: us.localTime,
      isOpenNow: us.isTradeable,
      listingNote: "ADR/ETF USA",
      usPhase: us.phase,
    }
  }

  const native = inferNativeExchange(ticker)
  if (native === "SMART" || US_LISTING_EXCHANGES.has(String(native))) {
    const us = getUsMarketSession()
    return {
      ticker: upper,
      exchange: "SMART",
      timeZone: us.timeZone,
      sessionLabel: us.sessionLabel,
      localTime: us.localTime,
      isOpenNow: us.isTradeable,
      usPhase: us.phase,
    }
  }

  return getMarketSessionForExchange(native, ticker)
}
