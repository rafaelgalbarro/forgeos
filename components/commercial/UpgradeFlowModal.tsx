"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import {
  getPlan,
  getStripeMode,
  quotePlan,
  requestUpgrade,
  validateCoupon,
} from "@/lib/commercial";
import type { CommercialPlanId, BillingInterval } from "@/lib/commercial";

interface UpgradeFlowModalProps {
  planId: CommercialPlanId;
  interval?: BillingInterval;
  onClose: () => void;
}

export function UpgradeFlowModal({ planId, interval = "monthly", onClose }: UpgradeFlowModalProps) {
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const plan = getPlan(planId);
  const quote = quotePlan(planId, interval);
  const couponResult = coupon ? validateCoupon(coupon, planId) : null;
  const discount = couponResult?.valid ? couponResult.percentOff : 0;
  const total = quote ? Math.round(quote.total * (1 - discount / 100)) : 0;

  async function handleConfirm() {
    setLoading(true);
    const result = await requestUpgrade(planId, undefined, interval);
    setMessage(result.message);
    setLoading(false);
    if (result.ok) setTimeout(onClose, 1500);
  }

  if (!plan) return null;

  return (
    <div
      className="fhis-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <Panel
        style={{ maxWidth: 480, width: "90%", padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Badge variant="default">Modo {getStripeMode()}</Badge>
        <h2 style={{ marginTop: 12 }}>Upgrade a {plan.name}</h2>
        <p>{plan.tagline}</p>

        {quote && (
          <p style={{ marginTop: 16 }}>
            Total estimado: <strong>€{total}</strong> ({interval === "annual" ? "anual" : "mensual"})
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          <input
            type="text"
            placeholder="Código cupón (opcional)"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            className="fhis-input"
            style={{ width: "100%" }}
          />
          {couponResult && (
            <p style={{ fontSize: "0.875rem", marginTop: 4 }}>{couponResult.message}</p>
          )}
        </div>

        {message && <p style={{ marginTop: 12 }}>{message}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Procesando…" : "Confirmar"}
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </Panel>
    </div>
  );
}
