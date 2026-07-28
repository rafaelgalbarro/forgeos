"use client";

import type { VentureSimulatorOverrides } from "@/lib/venture-simulator";
import { Input } from "@/components/ui/fhis/Input";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Grid } from "@/components/ui/fhis/Layout";

interface SimulatorOverridesFormProps {
  overrides: VentureSimulatorOverrides;
  defaults?: {
    monthlyPrice?: number;
    estimatedCAC?: number;
    monthlyChurnPercent?: number;
    monthlyBurn?: number;
    commissionPercent?: number;
    estimatedConversion?: number;
  };
  onChange: (next: VentureSimulatorOverrides) => void;
  compact?: boolean;
}

function numValue(v: number | undefined): string {
  return v != null && !Number.isNaN(v) ? String(v) : "";
}

function parseNum(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function SimulatorOverridesForm({
  overrides,
  defaults,
  onChange,
  compact = false,
}: SimulatorOverridesFormProps) {
  function patch(field: keyof VentureSimulatorOverrides, raw: string) {
    onChange({ ...overrides, [field]: parseNum(raw) });
  }

  return (
    <div className={compact ? "sim-overrides sim-overrides-compact" : "sim-overrides"}>
      <SectionHeader title="Supuestos editables (opcional)" />
      <Grid cols={compact ? 2 : 3} gap="sm">
        <Input
          label="Precio medio mensual (€)"
          type="number"
          min={0}
          step={1}
          placeholder={defaults?.monthlyPrice != null ? String(Math.round(defaults.monthlyPrice / 12)) : "—"}
          value={numValue(overrides.monthlyPrice)}
          onChange={(e) => patch("monthlyPrice", e.target.value)}
        />
        <Input
          label="CAC estimado (€)"
          type="number"
          min={0}
          step={1}
          placeholder={defaults?.estimatedCAC != null ? String(defaults.estimatedCAC) : "—"}
          value={numValue(overrides.estimatedCAC)}
          onChange={(e) => patch("estimatedCAC", e.target.value)}
        />
        <Input
          label="Churn mensual (%)"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder={defaults?.monthlyChurnPercent != null ? String(defaults.monthlyChurnPercent) : "—"}
          value={numValue(overrides.monthlyChurnPercent)}
          onChange={(e) => patch("monthlyChurnPercent", e.target.value)}
        />
        <Input
          label="Burn mensual (€)"
          type="number"
          min={0}
          step={100}
          placeholder={defaults?.monthlyBurn != null ? String(defaults.monthlyBurn) : "3500"}
          value={numValue(overrides.monthlyBurn)}
          onChange={(e) => patch("monthlyBurn", e.target.value)}
        />
        <Input
          label="Comisión (%)"
          type="number"
          min={0}
          max={50}
          step={0.5}
          placeholder={defaults?.commissionPercent != null ? String(defaults.commissionPercent) : "—"}
          value={numValue(overrides.commissionPercent)}
          onChange={(e) => patch("commissionPercent", e.target.value)}
        />
        <Input
          label="Conversión (%)"
          type="number"
          min={0}
          max={100}
          step={0.1}
          placeholder={defaults?.estimatedConversion != null ? String(defaults.estimatedConversion) : "—"}
          value={numValue(overrides.estimatedConversion)}
          onChange={(e) => patch("estimatedConversion", e.target.value)}
        />
      </Grid>
    </div>
  );
}
