/** Mask IBKR account ids for UI — keep first 2 + last 2 when long enough. */
export function maskAccountId(account: string | null | undefined): string {
  if (!account) return "NO_DATA";
  if (account === "PAPER_SIM") return "PAPER_SIM";
  const value = String(account);
  if (value.length <= 4) return `${value[0] ?? "*"}***`;
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function maskAccountList(accounts: readonly string[] | null | undefined): string[] {
  if (!accounts || accounts.length === 0) return [];
  return accounts.map(maskAccountId);
}
