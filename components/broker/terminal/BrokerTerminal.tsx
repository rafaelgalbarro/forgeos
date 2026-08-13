"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { AccountSummaryCards } from "./AccountSummaryCards";
import { BrokerActivityFeed } from "./BrokerActivityFeed";
import { BrokerTerminalHeader } from "./BrokerTerminalHeader";
import { MultiAccountPanel } from "./MultiAccountPanel";
import { OrdersTable } from "./OrdersTable";
import { PositionDetailPanel } from "./PositionDetailPanel";
import { PositionsTable } from "./PositionsTable";
import styles from "./terminal.module.css";
import type { IbkrPosition } from "./types";
import { BrokerTerminalProvider } from "./use-broker-terminal-data";

const BrokerExposurePanel = dynamic(
  () => import("./BrokerExposurePanel").then((m) => m.BrokerExposurePanel),
  {
    ssr: false,
    loading: () => (
      <div className={styles.skeleton} role="status">
        Loading exposure…
      </div>
    ),
  },
);

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.skeleton} role="status" aria-live="polite">
      Loading {label}…
    </div>
  );
}

function TerminalBody() {
  const [selected, setSelected] = useState<IbkrPosition | null>(null);
  const selectedKey = selected
    ? `${selected.account}|${selected.symbol}|${selected.secType}|${selected.currency}|${selected.conId ?? ""}`
    : null;

  return (
    <div className={styles.terminal}>
      <Suspense fallback={<SectionSkeleton label="header" />}>
        <BrokerTerminalHeader />
      </Suspense>

      <Suspense fallback={<SectionSkeleton label="account summary" />}>
        <AccountSummaryCards />
      </Suspense>

      <Suspense fallback={<SectionSkeleton label="multi-account" />}>
        <MultiAccountPanel />
      </Suspense>

      <Suspense fallback={<SectionSkeleton label="exposure" />}>
        <BrokerExposurePanel />
      </Suspense>

      <div className={selected ? styles.layoutWithPanelOpen : styles.layoutWithPanel}>
        <Suspense fallback={<SectionSkeleton label="positions" />}>
          <PositionsTable selectedKey={selectedKey} onSelect={(p) => setSelected(p)} />
        </Suspense>
        <PositionDetailPanel position={selected} onClose={() => setSelected(null)} />
      </div>

      <Suspense fallback={<SectionSkeleton label="orders" />}>
        <OrdersTable />
      </Suspense>

      <Suspense fallback={<SectionSkeleton label="activity" />}>
        <BrokerActivityFeed />
      </Suspense>
    </div>
  );
}

/**
 * Professional IBKR terminal — ANALYSIS_ONLY.
 * Shared polling via provider; connect path unchanged; no order placement UI.
 */
export function BrokerTerminal() {
  return (
    <BrokerTerminalProvider>
      <TerminalBody />
    </BrokerTerminalProvider>
  );
}
