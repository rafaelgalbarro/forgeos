export function profitFactorFromNet(net: number[]): number {
  let wins = 0;
  let losses = 0;
  for (const n of net) {
    if (n > 0) wins += n;
    else if (n < 0) losses += Math.abs(n);
  }
  if (losses <= 0) return wins > 0 ? 99 : 0;
  return wins / losses;
}
