import "server-only";

import { maskAccountId, maskAccountList } from "@/lib/ibkr/account-mask";
import { ibkrServiceFetch, IbkrServiceUnavailableError } from "@/lib/ibkr/service-client";

export type AccountTagValue = { value?: string; currency?: string };
export type AccountSummaryMap = Record<string, Record<string, AccountTagValue>>;

export type MultiAccountRow = {
  readonly accountId: string;
  readonly maskedId: string;
  readonly source: "env" | "broker" | "both";
  readonly state: "READY" | "NO_DATA";
  readonly netLiquidation: number | null;
  readonly totalCashValue: number | null;
  readonly currency: string | null;
  readonly note: string;
};

export type MultiAccountSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly configuredAccountIds: readonly string[];
  readonly brokerManagedAccounts: readonly string[];
  readonly maskedConfigured: readonly string[];
  readonly maskedBroker: readonly string[];
  readonly accounts: readonly MultiAccountRow[];
  readonly note: string;
};

/** Parse IBKR_ACCOUNT_IDS=acct1,acct2 (optional pin IBKR_ACCOUNT_ID). */
export function parseConfiguredAccountIds(): string[] {
  const multi = process.env.IBKR_ACCOUNT_IDS?.trim();
  const ids = new Set<string>();
  if (multi) {
    for (const part of multi.split(",")) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }
  const single = process.env.IBKR_ACCOUNT_ID?.trim();
  if (single) {
    ids.delete(single);
    return [single, ...ids];
  }
  return [...ids];
}

function tagNumber(tags: Record<string, AccountTagValue> | undefined, key: string): number | null {
  const raw = tags?.[key]?.value;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function tagCurrency(tags: Record<string, AccountTagValue> | undefined): string | null {
  const c =
    tags?.NetLiquidation?.currency?.trim() ||
    tags?.TotalCashValue?.currency?.trim() ||
    "";
  return c || null;
}

/**
 * Merge configured env accounts with live broker managedAccounts / account summary.
 * Missing balances stay NO_DATA — never invent numbers.
 */
export async function getMultiAccountSnapshot(): Promise<MultiAccountSnapshot> {
  const configured = parseConfiguredAccountIds();
  let brokerManaged: string[] = [];
  let accountMap: AccountSummaryMap = {};
  let brokerNote = "";

  try {
    const [status, account] = await Promise.all([
      ibkrServiceFetch<{ managedAccounts?: string[] }>("/api/ibkr/status").catch(() => null),
      ibkrServiceFetch<AccountSummaryMap>("/api/ibkr/account").catch(() => null),
    ]);
    if (Array.isArray(status?.managedAccounts)) {
      brokerManaged = status!.managedAccounts.filter((a) => typeof a === "string" && a.trim());
    }
    if (account && typeof account === "object") {
      accountMap = account;
    }
  } catch (err) {
    brokerNote =
      err instanceof IbkrServiceUnavailableError
        ? err.message
        : err instanceof Error
          ? err.message
          : "IBKR unavailable";
  }

  const fromMap = Object.keys(accountMap);
  const allIds = [
    ...new Set([...configured, ...brokerManaged, ...fromMap].filter(Boolean)),
  ];

  const accounts: MultiAccountRow[] = allIds.map((accountId) => {
    const inEnv = configured.includes(accountId);
    const inBroker = brokerManaged.includes(accountId) || fromMap.includes(accountId);
    const tags = accountMap[accountId];
    const netLiquidation = tagNumber(tags, "NetLiquidation");
    const totalCashValue = tagNumber(tags, "TotalCashValue");
    const hasData = netLiquidation != null || totalCashValue != null || Boolean(tags);
    return {
      accountId,
      maskedId: maskAccountId(accountId),
      source: inEnv && inBroker ? "both" : inEnv ? "env" : "broker",
      state: hasData ? "READY" : "NO_DATA",
      netLiquidation,
      totalCashValue,
      currency: tagCurrency(tags),
      note: hasData
        ? "Read-only IBKR summary"
        : inEnv && !inBroker
          ? "Configured in IBKR_ACCOUNT_IDS — no live summary"
          : "NO_DATA — account listed without summary tags",
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    configuredAccountIds: configured,
    brokerManagedAccounts: brokerManaged,
    maskedConfigured: maskAccountList(configured),
    maskedBroker: maskAccountList(brokerManaged),
    accounts,
    note:
      accounts.length === 0
        ? brokerNote ||
          "NO_DATA — set IBKR_ACCOUNT_IDS or connect IBKR for managedAccounts"
        : brokerNote
          ? `Partial: ${brokerNote}`
          : "Multi-account read-only view — no order routing",
  };
}
