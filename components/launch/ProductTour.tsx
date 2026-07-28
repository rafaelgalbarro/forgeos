"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import {
  PRODUCT_TOUR_STEPS,
  loadTourState,
  saveTourState,
  advanceTourStep,
  retreatTourStep,
  resetTourState,
  getTourProgress,
  getProductTourStep,
} from "@/lib/forgeos-launch";
import type { ProductTourState } from "@/lib/forgeos-launch";

export function ProductTour() {
  const [state, setState] = useState<ProductTourState | null>(null);

  useEffect(() => {
    setState(loadTourState());
  }, []);

  if (!state) return null;

  const step = getProductTourStep(state.currentStep);
  const progress = getTourProgress(state);
  const stepIndex = PRODUCT_TOUR_STEPS.findIndex((s) => s.id === state.currentStep);

  function handleNext() {
    const next = advanceTourStep(state!);
    setState(next);
    saveTourState(next);
  }

  function handleBack() {
    const prev = retreatTourStep(state!);
    setState(prev);
    saveTourState(prev);
  }

  function handleReset() {
    const initial = resetTourState();
    setState(initial);
  }

  return (
    <Panel className="fhis-product-tour">
      <Stack gap="md">
        <div className="fhis-product-tour-header">
          <Badge variant="accent">Tour {stepIndex + 1}/{PRODUCT_TOUR_STEPS.length}</Badge>
          <span className="fhis-product-tour-progress">{progress}%</span>
        </div>
        {step && (
          <>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            {step.highlight && (
              <Link href={step.highlight} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Explorar →
              </Link>
            )}
          </>
        )}
        <div className="fhis-product-tour-actions">
          <button
            type="button"
            className="fhis-btn fhis-btn-ghost fhis-btn-sm"
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            Anterior
          </button>
          <button
            type="button"
            className="fhis-btn fhis-btn-primary fhis-btn-sm"
            onClick={handleNext}
            disabled={state.completedAt != null}
          >
            {state.currentStep === "complete" ? "Completado" : "Siguiente"}
          </button>
          <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={handleReset}>
            Reiniciar
          </button>
        </div>
        <div className="fhis-product-tour-steps">
          {PRODUCT_TOUR_STEPS.map((s) => (
            <span
              key={s.id}
              className={`fhis-product-tour-dot${
                state.completedSteps.includes(s.id) ? " fhis-product-tour-dot-done" : ""
              }${state.currentStep === s.id ? " fhis-product-tour-dot-active" : ""}`}
              title={s.title}
            />
          ))}
        </div>
      </Stack>
    </Panel>
  );
}
