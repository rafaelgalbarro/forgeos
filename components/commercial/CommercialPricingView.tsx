"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import {
  COMMERCIAL_PLANS,
  FEATURE_MATRIX,
  formatPlanPrice,
  getStripeMode,
  isCommercialMode,
} from "@/lib/commercial";
import { trackPageView } from "@/lib/launch/analytics-hooks";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { UpgradeFlowModal } from "./UpgradeFlowModal";

export function CommercialPricingView() {
  const [upgradePlan, setUpgradePlan] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    trackPageView("/pricing");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <section className="fhis-launch-hero fhis-launch-hero-compact">
        <Container>
          <Stack gap="md">
            <Badge variant="default">
              Program 6000 · {getStripeMode() === "dry-run" ? "Sin pagos reales" : "Stripe activo"}
            </Badge>
            <h1 className="fhis-launch-hero-title">Planes y precios</h1>
            <p className="fhis-launch-hero-sub">
              Starter, Pro, Business y Enterprise — elige el plan que encaja con tu ambición.
            </p>
            {isCommercialMode() && (
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  size="sm"
                  variant={interval === "monthly" ? "primary" : "secondary"}
                  onClick={() => setInterval("monthly")}
                >
                  Mensual
                </Button>
                <Button
                  size="sm"
                  variant={interval === "annual" ? "primary" : "secondary"}
                  onClick={() => setInterval("annual")}
                >
                  Anual
                </Button>
              </div>
            )}
          </Stack>
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <div className="fhis-launch-pricing-grid">
            {COMMERCIAL_PLANS.map((plan) => (
              <Panel
                key={plan.id}
                className={`fhis-launch-pricing-card${plan.highlighted ? " fhis-launch-pricing-card-highlighted" : ""}`}
              >
                {plan.badge && <Badge variant="accent">{plan.badge}</Badge>}
                <h2 className="fhis-launch-pricing-name">{plan.name}</h2>
                <div className="fhis-launch-pricing-price">
                  <span className="fhis-launch-pricing-amount">
                    {formatPlanPrice(plan, interval)}
                  </span>
                </div>
                <p className="fhis-launch-pricing-desc">{plan.tagline}</p>
                <ul className="fhis-launch-pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <Button
                  className="fhis-launch-pricing-cta"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  onClick={() => setUpgradePlan(plan.id)}
                >
                  {plan.cta}
                </Button>
              </Panel>
            ))}
          </div>
        </Container>
      </section>

      <section className="fhis-launch-section fhis-launch-section-alt">
        <Container>
          <SectionHeader title="Matriz de funciones" description="Comparativa por plan" />
          <Panel>
            <table className="fhis-commercial-matrix" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Función</th>
                  <th style={{ padding: 8 }}>Starter</th>
                  <th style={{ padding: 8 }}>Pro</th>
                  <th style={{ padding: 8 }}>Business</th>
                  <th style={{ padding: 8 }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MATRIX.map((row) => (
                  <tr key={row.feature}>
                    <td style={{ padding: 8 }}>{row.feature}</td>
                    {(["starter", "pro", "business", "enterprise"] as const).map((col) => (
                      <td key={col} style={{ padding: 8, textAlign: "center" }}>
                        {typeof row[col] === "boolean"
                          ? row[col]
                            ? "✓"
                            : "—"
                          : row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <p style={{ marginTop: 16 }}>
            <Link href="/billing">Portal de facturación →</Link>
            {" · "}
            <Link href="/docs">Documentación →</Link>
          </p>
        </Container>
      </section>

      {upgradePlan && (
        <UpgradeFlowModal
          planId={upgradePlan as "starter" | "pro" | "business" | "enterprise"}
          interval={interval}
          onClose={() => setUpgradePlan(null)}
        />
      )}
    </div>
  );
}
