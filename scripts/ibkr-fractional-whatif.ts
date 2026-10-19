/**
 * Fractional share what-if (no live order). Requires IBKR broker + TWS; skips if offline.
 *
 *   npx tsx scripts/ibkr-fractional-whatif.ts
 *   npx tsx scripts/ibkr-fractional-whatif.ts --account U24225949 --symbol AAPL --quantity 0.1
 */

const baseUrl = process.env.IBKR_SERVICE_URL ?? "http://127.0.0.1:8002";
const apiKey = process.env.IBKR_INTERNAL_API_KEY;

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]!;
  return fallback;
}

async function main(): Promise<void> {
  if (!apiKey) {
    console.error("IBKR_INTERNAL_API_KEY not set — skip");
    process.exit(0);
  }
  const quantity = Number(arg("--quantity", "0.1"));
  const body = {
    account: arg("--account", "U24225949"),
    symbol: arg("--symbol", "AAPL"),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0.1,
  };
  const res = await fetch(`${baseUrl}/api/ibkr/fractional-whatif-probe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Api-Key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text.slice(0, 200));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
  const row = json as { skipped?: boolean; ok?: boolean };
  if (row.skipped) process.exit(0);
  if (!res.ok || row.ok === false) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
