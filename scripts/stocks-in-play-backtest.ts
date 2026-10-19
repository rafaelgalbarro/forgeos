import { runStocksInPlayBacktest } from "@/lib/trading/stocks-in-play/backtest-runner";

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--days="));
  const days = arg ? Number(arg.split("=")[1]) : 75;
  console.log(JSON.stringify(await runStocksInPlayBacktest({ days }), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
