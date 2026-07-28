"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Button } from "@/components/ui/fhis/Button";
import { Input } from "@/components/ui/fhis/Input";
import { Badge } from "@/components/ui/fhis/Badge";
import {
  ONBOARDING_STEPS,
  advanceOnboarding,
  completeOnboarding,
  getOnboardingState,
  getPrevStep,
  getStepIndex,
  getVentureEntryPath,
  goToStep,
} from "@/lib/launch/onboarding-flow";
import { hasBetaAccess } from "@/lib/launch/beta-signup";
import {
  trackOnboardingStart,
  trackOnboardingStep,
  trackOnboardingComplete,
} from "@/lib/launch/analytics-hooks";
import { LaunchNav } from "./LaunchNav";
import { FeedbackWidget } from "./FeedbackWidget";
import type { OnboardingState } from "@/lib/launch/types";

export function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    if (!hasBetaAccess()) {
      router.replace("/beta");
      return;
    }
    const s = getOnboardingState();
    setState(s);
    trackOnboardingStart();
  }, [router]);

  if (!state) {
    return (
      <div className="fhis-launch-page">
        <LaunchNav />
        <Container className="fhis-onboarding-loading">Cargando onboarding…</Container>
      </div>
    );
  }

  const stepIdx = getStepIndex(state.currentStep);
  const currentStepDef = ONBOARDING_STEPS[stepIdx];

  function refresh() {
    setState(getOnboardingState());
  }

  function handleNext() {
    if (!state) return;
    trackOnboardingStep(state.currentStep);
    if (state.currentStep === "workspace") {
      completeOnboarding();
      trackOnboardingComplete(state.venturePath);
      refresh();
      return;
    }
    advanceOnboarding({});
    refresh();
  }

  function handleBack() {
    if (!state) return;
    const prev = getPrevStep(state.currentStep);
    if (prev) {
      goToStep(prev);
      refresh();
    }
  }

  function handleEnterForgeOS() {
    router.push("/os");
  }

  function handleFirstVenture() {
    const path = getVentureEntryPath(getOnboardingState());
    router.push(path);
  }

  function addGoal() {
    if (!state || !goalInput.trim()) return;
    const goals = [...state.goals, goalInput.trim()].slice(0, 5);
    advanceOnboarding({ goals });
    setGoalInput("");
    refresh();
  }

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-onboarding">
        <SectionHeader
          title="Configura tu workspace"
          description="Paso a paso hacia tu primera venture"
        />

        <div className="fhis-onboarding-steps">
          {ONBOARDING_STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`fhis-onboarding-step-indicator${
                i < stepIdx ? " fhis-onboarding-step-done" : ""
              }${i === stepIdx ? " fhis-onboarding-step-active" : ""}`}
            >
              <span className="fhis-onboarding-step-num">{i + 1}</span>
              <span className="fhis-onboarding-step-label">{step.title}</span>
            </div>
          ))}
        </div>

        <Panel className="fhis-onboarding-panel">
          <Badge variant="default">
            Paso {stepIdx + 1} de {ONBOARDING_STEPS.length}
          </Badge>
          <h2 className="fhis-onboarding-step-title">{currentStepDef.title}</h2>
          <p className="fhis-onboarding-step-desc">{currentStepDef.description}</p>

          {state.currentStep === "welcome" && (
            <Stack gap="md">
              <p>
                ForgeOS te guía desde la idea hasta una venture operativa. En RC12 todo corre en
                dry-run — perfecto para explorar sin riesgo.
              </p>
            </Stack>
          )}

          {state.currentStep === "profile" && (
            <Stack gap="md">
              <Input
                label="Nombre"
                value={state.profile.name}
                onChange={(e) =>
                  setState({ ...state, profile: { ...state.profile, name: e.target.value } })
                }
              />
              <Input
                label="Empresa / Proyecto"
                value={state.profile.company}
                onChange={(e) =>
                  setState({ ...state, profile: { ...state.profile, company: e.target.value } })
                }
              />
              <div className="fhis-onboarding-role-select">
                <label className="fhis-input-label">Rol</label>
                <div className="fhis-onboarding-roles">
                  {(["founder", "creator", "executive"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`fhis-onboarding-role${
                        state.profile.role === role ? " fhis-onboarding-role-active" : ""
                      }`}
                      onClick={() =>
                        setState({ ...state, profile: { ...state.profile, role } })
                      }
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </Stack>
          )}

          {state.currentStep === "goals" && (
            <Stack gap="md">
              <div className="fhis-onboarding-goals-input">
                <Input
                  label="Añadir objetivo"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Ej: Lanzar SaaS en 30 días"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGoal())}
                />
                <Button size="sm" onClick={addGoal}>
                  Añadir
                </Button>
              </div>
              <ul className="fhis-onboarding-goals-list">
                {state.goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </Stack>
          )}

          {state.currentStep === "workspace" && (
            <Stack gap="md">
              <p>¿Cómo quieres crear tu primera venture demo?</p>
              <div className="fhis-onboarding-paths">
                {(
                  [
                    { id: "venture-factory", label: "Venture Factory", desc: "Pipeline automático completo" },
                    { id: "founder-journey", label: "Founder Journey", desc: "Recorrido guiado por fases" },
                    { id: "founder", label: "Founder Dashboard", desc: "Panel ejecutivo del fundador" },
                  ] as const
                ).map((path) => (
                  <button
                    key={path.id}
                    type="button"
                    className={`fhis-onboarding-path${
                      state.venturePath === path.id ? " fhis-onboarding-path-active" : ""
                    }`}
                    onClick={() => setState({ ...state, venturePath: path.id })}
                  >
                    <strong>{path.label}</strong>
                    <span>{path.desc}</span>
                  </button>
                ))}
              </div>
            </Stack>
          )}

          {state.currentStep === "complete" && (
            <Stack gap="lg">
              <p className="fhis-onboarding-complete-msg">
                ¡Todo listo, {state.profile.name || "fundador"}! Entra a ForgeOS y crea tu primera venture.
              </p>
              <div className="fhis-onboarding-complete-actions">
                <Button onClick={handleEnterForgeOS}>Entrar a ForgeOS →</Button>
                <Button variant="ghost" onClick={handleFirstVenture}>
                  Crear primera venture demo →
                </Button>
              </div>
              <p className="fhis-onboarding-complete-hint">
                Ruta seleccionada:{" "}
                <Link href={getVentureEntryPath(state)}>
                  {getVentureEntryPath(state)}
                </Link>
              </p>
            </Stack>
          )}

          {state.currentStep !== "complete" && (
            <div className="fhis-onboarding-nav">
              <Button variant="ghost" onClick={handleBack} disabled={stepIdx === 0}>
                Atrás
              </Button>
              <Button
                onClick={() => {
                  if (state.currentStep === "profile") {
                    advanceOnboarding({ profile: state.profile });
                    refresh();
                  } else if (state.currentStep === "goals") {
                    advanceOnboarding({ goals: state.goals });
                    refresh();
                  } else {
                    handleNext();
                  }
                }}
              >
                {state.currentStep === "workspace" ? "Completar" : "Siguiente"}
              </Button>
            </div>
          )}
        </Panel>
      </Container>
    </div>
  );
}
