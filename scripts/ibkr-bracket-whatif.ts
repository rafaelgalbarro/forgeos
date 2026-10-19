/**
 * Bracket what-if probe (no live order). Requires IBKR broker + TWS; skips if offline.
 *
 *   npx tsx scripts/ibkr-bracket-whatif.ts
 *   npx tsx scripts/ibkr-bracket-whatif.ts --account U24225949 --symbol BAC
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
  const body = {
    account: arg("--account", "U24225949"),
    symbol: arg("--symbol", "BAC"),
    quantity: 1,
  };
  const res = await fetch(`${baseUrl}/api/ibkr/bracket-whatif-probe`, {
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
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
