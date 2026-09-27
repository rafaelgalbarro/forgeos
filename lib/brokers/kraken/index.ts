/**
 * Kraken Spot broker — EUR crypto for ForgeOS.
 */

export {
  KrakenAdapter,
  getKrakenAdapter,
  type KrakenAccount,
  type KrakenPosition,
  type KrakenQuote,
  type KrakenBar,
  type KrakenOrderResult,
} from "./adapter";
export {
  KRAKEN_EUR_PAIRS,
  type KrakenEurPair,
  normalizeKrakenPair,
  isKrakenEurPair,
  krakenPairBase,
  pairFromBase,
} from "./pairs";
export { isKrakenConfigured } from "./sign";
export {
  ensureKrakenAssetPairs,
  getKrakenPairMeta,
  quantizeKrakenVolume,
  quantizeKrakenPrice,
  type KrakenPairMeta,
} from "./asset-pairs";
export {
  refreshKrakenUniverse,
  getKrakenUniversePairs,
  peekKrakenUniverse,
  type KrakenUniversePair,
} from "./universe";
export {
  startKrakenMarketData,
  getKrakenWsStatus,
  updateKrakenMarketSubscriptions,
} from "./ws-client";
