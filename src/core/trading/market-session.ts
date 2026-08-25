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
  | "PAXOS"

/** Crypto 24h (PAXOS) — lista local, sin dependencias server-only. */
const ALWAYS_ON_CRYPTO_TICKERS = ["BTC", "ETH", "LTC", "BCH", "XRP"] as const

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
  PAXOS: null,
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
  PAXOS: "PAXOS",
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
  /** Premarket 14:00-14:30 outside_rth */
  preMarket: { startH: 14, startM: 0, endH: 14, endM: 29 },
  /** Regular 14:30-22:00 */
  regular: { startH: 14, startM: 30, endH: 22, endM: 0 },
  /** After-hours 22:00-02:00 outside_rth */
  afterMarket: { startH: 22, startM: 0, endH: 2, endM: 0 },
  /** Closed 02:00-14:00 */
  closed: { startH: 2, startM: 0, endH: 14, endM: 0 },
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
 * PRE_MARKET 14:00-14:29 | REGULAR 14:30-22:00 | AFTER_MARKET 22:00-02:00 | CLOSED 02:00-14:00
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
      sessionLabel: "14:00-14:30 (premarket USA, outside_rth)",
      isTradeable: true,
      isExtendedHours: true,
    }
  }
  if (inMinuteRange(nowMinutes, regular.startH, regular.startM, regular.endH, regular.endM)) {
    return {
      phase: "REGULAR",
      timeZone: tz,
      localTime,
      sessionLabel: "14:30-22:00 (mercado regular USA)",
      isTradeable: true,
      isExtendedHours: false,
    }
  }
  if (inMinuteRange(nowMinutes, afterMarket.startH, afterMarket.startM, afterMarket.endH, afterMarket.endM)) {
    return {
      phase: "AFTER_MARKET",
      timeZone: tz,
      localTime,
      sessionLabel: "22:00-02:00 (aftermarket USA, outside_rth)",
      isTradeable: true,
      isExtendedHours: true,
    }
  }
  if (inMinuteRange(nowMinutes, closed.startH, closed.startM, closed.endH, closed.endM)) {
    return {
      phase: "CLOSED",
      timeZone: tz,
      localTime,
      sessionLabel: "02:00-14:00 (USA cerrado — ETFs regionales / outside_rth)",
      // Keep tradeable so Asia/Europe ETF proxies can still fire with outside_rth
      isTradeable: true,
      isExtendedHours: true,
    }
  }

  return {
    phase: "CLOSED",
    timeZone: tz,
    localTime,
    sessionLabel: "Extended 24h (outside RTH)",
    isTradeable: true,
    isExtendedHours: true,
  }
}

export function isUsMarketTradeable(): boolean {
  return getUsMarketSession().isTradeable
}

/** Regional ETFs (IBKR SMART) used when native listings are unavailable. */
export const ASIA_ETF_TICKERS = ["EWJ", "FXI", "EWA", "EWY", "EWT", "EWS"] as const
export const ASIA_DIRECT_TICKERS = ["BABA", "NIO", "JD", "BIDU", "TCEHY", "SE", "GRAB"] as const
export const EUROPE_ETF_TICKERS = ["EZU", "VGK", "EWG", "EWU", "EWQ", "EWI"] as const
export const EUROPE_DIRECT_TICKERS = ["ASML", "SAP", "LVMUY", "NESN"] as const

export type GlobalMarketWindow = {
  asia: boolean
  europe: boolean
  usa: boolean
  usaExtended: boolean
  anyOpen: boolean
  standby: boolean
  localTime: string
  weekday: boolean
  /** ASIA | EUROPE | USA | CLOSED — etiqueta simple */
  label: "ASIA" | "EUROPE" | "USA" | "CLOSED"
}

function isMadridWeekday(): boolean {
  const wd = toMadridParts().weekday.toLowerCase()
  return !wd.startsWith("sat") && !wd.startsWith("sun")
}

/** Hora Madrid como decimal (14:30 → 14.5). */
export function getMadridHour(): number {
  const { hour, minute } = toMadridParts()
  return hour + minute / 60
}

/** Tokio TSE 01:00-07:30 Madrid. */
export function isTokyoOpen(): boolean {
  if (!isMadridWeekday()) return false
  return inMinuteRange(toMadridParts().nowMinutes, 1, 0, 7, 30)
}

/** Hong Kong HKEX 02:00-08:00 Madrid. */
export function isHongKongOpen(): boolean {
  if (!isMadridWeekday()) return false
  return inMinuteRange(toMadridParts().nowMinutes, 2, 0, 8, 0)
}

/** Sydney ASX 00:00-06:00 Madrid. */
export function isSydneyOpen(): boolean {
  if (!isMadridWeekday()) return false
  return inMinuteRange(toMadridParts().nowMinutes, 0, 0, 6, 0)
}

/** Asia operativa Madrid: 01:00–08:00. */
export function isAsiaOpen(): boolean {
  if (!isMadridWeekday()) return false
  const h = getMadridHour()
  return h >= 1 && h < 8
}

/** Europa 09:00–17:30 Madrid. */
export function isEuropeOpen(): boolean {
  if (!isMadridWeekday()) return false
  const h = getMadridHour()
  return h >= 9 && h < 17.5
}

/** USA regular 14:30–22:00 Madrid. */
export function isUSAOpen(): boolean {
  if (!isMadridWeekday()) return false
  const h = getMadridHour()
  return h >= 14.5 && h < 22
}

/** USA pre 14:00–14:30 + after 22:00–02:00 Madrid. */
export function isUSAExtendedOpen(): boolean {
  if (!isMadridWeekday()) return false
  const h = getMadridHour()
  return (h >= 14 && h < 14.5) || h >= 22 || h < 2
}

export function isAnyMarketOpen(): boolean {
  return isAsiaOpen() || isEuropeOpen() || isUSAOpen()
}

export function getGlobalMarketWindow(): GlobalMarketWindow {
  const { localTime } = toMadridParts()
  const weekday = isMadridWeekday()
  const asia = isAsiaOpen()
  const europe = isEuropeOpen()
  const usa = isUSAOpen()
  const usaExtended = isUSAExtendedOpen()
  const anyOpen = asia || europe || usa || usaExtended
  let label: GlobalMarketWindow["label"] = "CLOSED"
  if (asia && !usa) label = "ASIA"
  else if (europe && !usa) label = "EUROPE"
  else if (usa || usaExtended) label = "USA"
  else if (asia) label = "ASIA"
  else if (europe) label = "EUROPE"
  return {
    asia,
    europe,
    usa,
    usaExtended,
    anyOpen,
    standby: !anyOpen,
    localTime,
    weekday,
    label,
  }
}

export function isAsiaFocusTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase()
  return (
    (ASIA_ETF_TICKERS as readonly string[]).includes(t) ||
    (ASIA_DIRECT_TICKERS as readonly string[]).includes(t) ||
    t.endsWith(".T") ||
    t.endsWith(".HK") ||
    t.endsWith(".AX")
  )
}

export function isEuropeFocusTicker(ticker: string): boolean {
  const t = ticker.trim().toUpperCase()
  return (
    (EUROPE_ETF_TICKERS as readonly string[]).includes(t) ||
    (EUROPE_DIRECT_TICKERS as readonly string[]).includes(t)
  )
}

function withAlwaysOnCrypto(tickers: readonly string[]): string[] {
  // BTC/ETH/LTC mínimo 24h (+ resto PAXOS) — sin import server-only
  return [
    ...new Set([
      ...ALWAYS_ON_CRYPTO_TICKERS,
      ...tickers.map((t) => t.trim().toUpperCase()).filter(Boolean),
    ]),
  ]
}

/**
 * Filtra el universo al mercado abierto.
 * Crypto IBKR (PAXOS) siempre entra — mercado 24h.
 * Asia abierta → ETFs/directos Asia. Europa abierta → ETFs/directos Europa.
 * USA → lista combinada. Standby equity → solo crypto.
 */
export function selectTickersForOpenMarkets(tickers: readonly string[]): {
  tickers: string[]
  mode: "asia" | "europe" | "combined" | "crypto"
} {
  const w = getGlobalMarketWindow()
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))]

  if (w.standby) {
    return { tickers: withAlwaysOnCrypto([]), mode: "crypto" }
  }

  const usaTradeable = w.usa || w.usaExtended
  const result: string[] = [...unique]

  if (w.asia) {
    result.push(...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS)
  }
  if (w.europe) {
    result.push(...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS)
  }

  if (w.asia && !w.europe && !usaTradeable) {
    const asia = result.filter(isAsiaFocusTicker)
    const fallback = [...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS]
    return {
      tickers: withAlwaysOnCrypto(asia.length ? asia : fallback),
      mode: "asia",
    }
  }
  if (w.europe && !w.asia && !usaTradeable) {
    const eu = result.filter(isEuropeFocusTicker)
    const fallback = [...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS]
    return {
      tickers: withAlwaysOnCrypto(eu.length ? eu : fallback),
      mode: "europe",
    }
  }
  return { tickers: withAlwaysOnCrypto(result), mode: "combined" }
}

/** 1 min first USA hour; 3 min siempre (crypto 24h). */
export function getTradingCycleIntervalMs(_now = new Date()): number {
  void _now
  const w = getGlobalMarketWindow()
  const { nowMinutes } = toMadridParts()
  if (w.weekday && inMinuteRange(nowMinutes, 14, 30, 15, 30) && w.usa) return 60 * 1000
  return 3 * 60 * 1000
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
