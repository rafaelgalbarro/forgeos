"use client";

import { maskAccountId } from "@/lib/ibkr/account-mask";
import { TerminalBadge } from "./Badge";
import { formatNumber, formatOptional, formatQty, noData, optionalMarketField } from "./format";
import styles from "./terminal.module.css";
import type { IbkrPosition } from "./types";

export function PositionDetailPanel({
  position,
  onClose,
}: {
  position: IbkrPosition | null;
  onClose: () => void;
}) {
  if (!position) return null;

  return (
    <aside className={styles.sidePanel} data-panel-id="position-detail" aria-label="Position detail">
      <div className={styles.sidePanelHeader}>
        <div>
          <h3 className={styles.sidePanelTitle}>{position.symbol}</h3>
          <p className={styles.sectionNote}>
            {position.secType} · {maskAccountId(position.account)} · read-only
          </p>
        </div>
        <button type="button" className={styles.btn} onClick={onClose}>
          Close
        </button>
      </div>

      <div className={styles.sideSection}>
        <h4>Contract</h4>
        <dl className={styles.kv}>
          <dt>Symbol</dt>
          <dd>{position.symbol}</dd>
          <dt>Name</dt>
          <dd>{formatOptional(position.name)}</dd>
          <dt>conId</dt>
          <dd>{formatOptional(position.conId)}</dd>
          <dt>Asset class</dt>
          <dd>{position.secType || noData()}</dd>
          <dt>Exchange</dt>
          <dd>{position.exchange || noData()}</dd>
          <dt>Currency</dt>
          <dd>{position.currency || noData()}</dd>
          <dt>Account</dt>
          <dd>{maskAccountId(position.account)}</dd>
          <dt>Quantity</dt>
          <dd>{formatQty(position.position)}</dd>
        </dl>
      </div>

      <div className={styles.sideSection}>
        <h4>Pricing & P&L</h4>
        <dl className={styles.kv}>
          <dt>Avg price</dt>
          <dd>{formatNumber(position.avgCost, 4)}</dd>
          <dt>Current price</dt>
          <dd>{optionalMarketField(position.marketPrice)}</dd>
          <dt>Market value</dt>
          <dd>{optionalMarketField(position.marketValue)}</dd>
          <dt>P&L</dt>
          <dd>{optionalMarketField(position.unrealizedPnl)}</dd>
          <dt>P&L %</dt>
          <dd>{optionalMarketField(position.unrealizedPnlPct)}</dd>
          <dt>Portfolio weight</dt>
          <dd>{noData()}</dd>
          <dt>Exposure</dt>
          <dd>{noData()}</dd>
        </dl>
      </div>

      <div className={styles.sideSection}>
        <h4>Technical analysis</h4>
        <p className={styles.placeholderBlock}>{noData()} — placeholder (no invented signals)</p>
      </div>

      <div className={styles.sideSection}>
        <h4>Fundamental analysis</h4>
        <p className={styles.placeholderBlock}>{noData()} — placeholder (no invented metrics)</p>
      </div>

      <div className={styles.sideSection}>
        <h4>Committee decision</h4>
        <p className={styles.placeholderBlock}>{noData()}</p>
      </div>

      <div className={styles.sideSection}>
        <h4>Risk assessment</h4>
        <p className={styles.placeholderBlock}>{noData()}</p>
      </div>

      <div className={styles.sideSection}>
        <h4>Thesis</h4>
        <p className={styles.placeholderBlock}>{noData()}</p>
      </div>

      <div className={styles.sideSection}>
        <h4>Risks</h4>
        <p className={styles.placeholderBlock}>{noData()}</p>
      </div>

      <div className={styles.sideSection}>
        <h4>Upcoming events</h4>
        <p className={styles.placeholderBlock}>{noData()}</p>
      </div>

      <div className={styles.sideSection}>
        <h4>Recommendation</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <TerminalBadge tone="gray">NO_DATA</TerminalBadge>
          <span className={styles.sectionNote}>Confidence: {noData()}</span>
        </div>
        <p className={styles.placeholderBlock} style={{ marginTop: 8 }}>
          Sources: {noData()}
        </p>
        <p className={styles.sectionNote} style={{ marginTop: 10 }}>
          No order creation from this screen · ANALYSIS_ONLY
        </p>
      </div>
    </aside>
  );
}
