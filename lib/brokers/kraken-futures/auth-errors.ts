/** Kraken Futures private REST auth / credential failures. */
export function isKrakenFuturesAuthError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("authenticationerror") ||
    m.includes("authentication error") ||
    m.includes("invalid signature") ||
    m.includes("invalid authent") ||
    m.includes("api key") ||
    m.includes("apikey")
  );
}
