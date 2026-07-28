"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Badge } from "@/components/ui/fhis/Badge";
import type { FinancialModel } from "@/lib/mission-control/investor-mode/types";

interface Props {
  model: FinancialModel;
}

export function FinancialModelView({ model }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Modelo Financiero" subtitle={`Proyección ${model.horizonYears} años · ${model.disclaimer}`} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <KpiBlock label="Burn mensual" value={`${model.monthlyBurn.toLocaleString("es-ES")} €`} />
          <KpiBlock label="Revenue mensual" value={`${model.monthlyRevenue.toLocaleString("es-ES")} €`} />
          <KpiBlock label="Runway" value={`${Math.round(model.runwayMonths)} meses`} />
        </div>
        <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--fhis-color-border)" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Año</th>
              <th style={{ textAlign: "right", padding: 8 }}>Revenue</th>
              <th style={{ textAlign: "right", padding: 8 }}>Burn</th>
              <th style={{ textAlign: "right", padding: 8 }}>Cash neto</th>
              <th style={{ textAlign: "right", padding: 8 }}>Headcount</th>
            </tr>
          </thead>
          <tbody>
            {model.projections.map((p) => (
              <tr key={p.year} style={{ borderBottom: "1px solid var(--fhis-color-border)" }}>
                <td style={{ padding: 8 }}>Año {p.year}</td>
                <td style={{ textAlign: "right", padding: 8 }}>{p.revenue.toLocaleString("es-ES")} €</td>
                <td style={{ textAlign: "right", padding: 8 }}>{p.burn.toLocaleString("es-ES")} €</td>
                <td style={{ textAlign: "right", padding: 8 }}>{p.netCash.toLocaleString("es-ES")} €</td>
                <td style={{ textAlign: "right", padding: 8 }}>{p.headcount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Supuestos</h4>
          <ul style={{ fontSize: "0.875rem", paddingLeft: 20 }}>
            {model.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
        <Badge variant="amber">{model.disclaimer}</Badge>
      </Stack>
    </Panel>
  );
}
