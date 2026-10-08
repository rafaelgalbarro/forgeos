import {
  ALPACA_CRYPTO_PAIRS,
  ALPACA_FOREX_PAIRS,
} from "@/lib/brokers/alpaca-pairs";
import {
  getUsExchangeSession,
  isUsPremarketSession,
  zonedClock,
} from "@/lib/trading/exchange-hours";

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

/** Crypto 24h — alineado con BINANCE_CRYPTO_TICKERS / Alpaca crypto. */
const ALWAYS_ON_CRYPTO_TICKERS = ["BTC", "ETH", "SOL", "AVAX", "DOGE", "XRP", "ADA", "LINK", "LTC", "BCH"] as const

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
 * Sesión USA en America/New_York (IANA) — correcto con DST vs Europa.
 * Premarket 04:00–09:30 | Regular 09:30–16:00 | resto CLOSED (entries: solo regular).
 */
export function getUsMarketSession(): UsMarketSession {
  const us = getUsExchangeSession()
  const clock = us.clock
  const localTime = `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`
  const tz = "America/New_York"

  if (us.phase === "PRE_MARKET") {
    return {
      phase: "PRE_MARKET",
      timeZone: tz,
      localTime,
      sessionLabel: "04:00-09:30 ET (premarket USA, outside_rth)",
      isTradeable: true,
      isExtendedHours: true,
    }
  }
  if (us.phase === "REGULAR") {
    return {
      phase: "REGULAR",
      timeZone: tz,
      localTime,
      sessionLabel: "09:30-16:00 ET (mercado regular USA)",
      isTradeable: true,
      isExtendedHours: false,
    }
  }

  const after =
    !clock.weekend &&
    clock.nowMinutes >= 16 * 60 &&
    clock.nowMinutes < 20 * 60
  if (after) {
    return {
      phase: "AFTER_MARKET",
      timeZone: tz,
      localTime,
      sessionLabel: "16:00-20:00 ET (aftermarket USA, outside_rth)",
      isTradeable: false,
      isExtendedHours: true,
    }
  }

  const madrid = zonedClock("Europe/Madrid")
  return {
    phase: "CLOSED",
    timeZone: tz,
    localTime,
    sessionLabel: clock.weekend
      ? "Fin de semana (NYSE cerrado)"
      : `NYSE cerrado (${localTime} ET / ${String(madrid.hour).padStart(2, "0")}:${String(madrid.minute).padStart(2, "0")} Madrid)`,
    isTradeable: false,
    isExtendedHours: false,
  }
}

export function isUsMarketTradeable(): boolean {
  return getUsMarketSession().isTradeable
}

/** Regional ETFs (IBKR SMART) used when native listings are unavailable. */
export const ASIA_ETF_TICKERS = ["EWJ", "FXI", "EWA", "EWY", "EWT", "EWS"] as const
export const ASIA_DIRECT_TICKERS = [
  "BABA",
  "NIO",
  "JD",
  "BIDU",
  "TCEHY",
  "SE",
  "GRAB",
  "SONY",
  "TSM",
] as const
export const EUROPE_ETF_TICKERS = [
  "EZU",
  "VGK",
  "EWG",
  "EWU",
  "EWQ",
  "EWI",
  "EWP",
  "EWL",
  "EWN",
  "EWD",
  "IEUR",
  "FEZ",
  "BBEU",
  "HEZU",
] as const
/** European ADRs / dual-listed names liquid on NYSE/NASDAQ (IBKR SMART). */
export const EUROPE_DIRECT_TICKERS = [
  "ASML",
  "SAP",
  "LVMUY",
  "NESN",
  "SHEL",
  "BP",
  "UL",
  "GSK",
  "NVO",
  "AZN",
  "SNY",
  "RHHBY",
  "NGG",
  "ING",
  "DB",
  "CS",
  "BBVA",
  "SAN",
  "TEF",
  "PHG",
  "ERIC",
  "NOK",
  "STM",
  "ARM",
  "SPOT",
  "CRH",
  "DEO",
  "BUD",
  "ADDYY",
  "DANOY",
  "SIEGY",
  "VWAGY",
] as const

/** Alias — full Europe ADR focus set. */
export const EUROPE_ADR_TICKERS = EUROPE_DIRECT_TICKERS

/** Fase operativa Madrid (timing de ciclo + reglas de entrada). */
export type ActiveTradingPhase =
  | "ASIA"
  | "EUROPE_OPEN"
  | "EUROPE"
  | "USA_PREMARKET"
  | "USA_OPEN"
  | "USA_REGULAR"
  | "USA_AFTERHOURS"
  | "STANDBY_CRYPTO"

export function getActiveTradingPhase(): ActiveTradingPhase {
  const weekday = isMadridWeekday()
  const { nowMinutes } = toMadridParts()
  const h = getMadridHour()

  if (!weekday) {
    if (h >= 22 || h < 2) return "USA_AFTERHOURS"
    return "STANDBY_CRYPTO"
  }

  // USA windows take priority when overlapping Europe afternoon
  if (inMinuteRange(nowMinutes, 14, 0, 14, 30)) return "USA_PREMARKET"
  if (inMinuteRange(nowMinutes, 14, 30, 15, 30)) return "USA_OPEN"
  if (inMinuteRange(nowMinutes, 15, 30, 21, 0)) return "USA_REGULAR"
  if (h >= 22 || h < 2) return "USA_AFTERHOURS"

  if (inMinuteRange(nowMinutes, 9, 0, 10, 0)) return "EUROPE_OPEN"
  if (isEuropeOpen()) return "EUROPE"
  if (isAsiaOpen()) return "ASIA"
  return "STANDBY_CRYPTO"
}

export function isUsaPremarketPrepareOnly(): boolean {
  return isUsPremarketSession()
}

export function isUsaFirstHour(): boolean {
  return getActiveTradingPhase() === "USA_OPEN"
}

export function isEuropeFirstHour(): boolean {
  return getActiveTradingPhase() === "EUROPE_OPEN"
}

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
  const alpaca = [...ALPACA_FOREX_PAIRS, ...ALPACA_CRYPTO_PAIRS];
  return [
    ...new Set([
      ...ALWAYS_ON_CRYPTO_TICKERS,
      ...alpaca,
      ...tickers.map((t) => t.trim().toUpperCase()).filter(Boolean),
    ]),
  ];
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

/**
 * Intervalo de ciclo por sesión Madrid:
 * Alpaca FX+Crypto 24h @ 1m · USA open 1m · USA regular/Europe 3m · Asia/after 5m · standby 1m (crypto)
 */
export function getTradingCycleIntervalMs(_now = new Date()): number {
  void _now
  switch (getActiveTradingPhase()) {
    case "USA_OPEN":
    case "USA_PREMARKET":
    case "STANDBY_CRYPTO":
      return 60 * 1000
    case "USA_AFTERHOURS":
    case "ASIA":
      return 5 * 60 * 1000
    case "EUROPE":
    case "EUROPE_OPEN":
    case "USA_REGULAR":
    default:
      return 3 * 60 * 1000
  }
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
