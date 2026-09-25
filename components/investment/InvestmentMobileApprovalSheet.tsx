"use client";

import { useCallback, useEffect, useState } from "react";
import { safeJsonFetch } from "@/lib/http/safe-json-fetch";
import { useInvestmentStream } from "@/lib/investment/use-investment-stream";
import styles from "@/styles/investment/mobile-approval.module.css";

type PendingOrder = {
  approvalId: string;
  ticker: string;
  direction: string;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  signal: { confidence: number; reasoning: string };
};

/** Bottom sheet for quick mobile approval (thumb zone). */
export function InvestmentMobileApprovalSheet() {
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await safeJsonFetch<{
      pendingApprovals?: PendingOrder[];
    }>("/api/trading/cycle");
    if (res.ok && res.data?.pendingApprovals) {
      setPending(res.data.pendingApprovals);
      setOpen(res.data.pendingApprovals.length > 0);
    }
  }, []);

  useInvestmentStream((event) => {
    if (event.type === "signal" || event.type === "cycle_complete") {
      void refresh();
    }
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (approvalId: string, action: "approve" | "reject") => {
    setActing(approvalId);
    try {
      await fetch(`/api/trading/cycle?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId }),
      });
      await refresh();
    } finally {
      setActing(null);
    }
  };

  if (!open || pending.length === 0) return null;

  const top = pending[0]!;

  return (
    <div className={styles.sheetOverlay} role="presentation" onClick={() => setOpen(false)}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-label="Aprobación rápida"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <p className={styles.sheetKicker}>Señal pendiente</p>
        <h2 className={styles.sheetTitle}>
          {top.ticker} · {top.direction}
        </h2>
        <p className={styles.sheetReason}>{top.signal.reasoning}</p>
        <dl className={styles.sheetMeta}>
          <div>
            <dt>Confianza</dt>
            <dd>{(top.signal.confidence * 100).toFixed(0)}%</dd>
          </div>
          <div>
            <dt>Entry</dt>
            <dd>${top.price.toFixed(2)}</dd>
          </div>
          {top.stopLoss != null ? (
            <div>
              <dt>SL</dt>
              <dd>${top.stopLoss.toFixed(2)}</dd>
            </div>
          ) : null}
          {top.takeProfit != null ? (
            <div>
              <dt>TP</dt>
              <dd>${top.takeProfit.toFixed(2)}</dd>
            </div>
          ) : null}
        </dl>
        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.btnApprove}
            disabled={acting != null}
            onClick={() => void act(top.approvalId, "approve")}
          >
            ✅ Aprobar
          </button>
          <button
            type="button"
            className={styles.btnReject}
            disabled={acting != null}
            onClick={() => void act(top.approvalId, "reject")}
          >
            ❌ Rechazar
          </button>
        </div>
        {pending.length > 1 ? (
          <p className={styles.sheetMore}>+{pending.length - 1} más en cola</p>
        ) : null}
      </div>
    </div>
  );
}
