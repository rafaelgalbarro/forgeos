"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Button } from "@/components/ui/fhis/Button";
import { Input } from "@/components/ui/fhis/Input";
import { Select } from "@/components/ui/fhis/Select";
import { Badge } from "@/components/ui/fhis/Badge";
import { APP_CATEGORIES } from "@/lib/types/app";
import {
  FOUNDER_ONBOARDING_STEPS,
  advanceFounderOnboarding,
  getFounderOnboardingState,
  getFounderStepIndex,
  getPrevFounderStep,
  goToFounderStep,
  validateFounderStep,
} from "@/lib/founder-journey/onboarding-wizard";
import {
  finalizeFounderJourney,
  prepareCeoBriefingStep,
  syncProfileFromOnboarding,
} from "@/lib/founder-journey/journey-manager";
import { buildCeoWelcomeContent } from "@/lib/founder-journey/ceo-welcome";
import type { FounderOnboardingState } from "@/lib/founder-journey/types";
import { FounderJourneyShell } from "./FounderJourneyShell";
import { ProgressTracker } from "./ProgressTracker";
import { CeoWelcomePanel } from "./CeoWelcomePanel";
import { computeJourneyProgress } from "@/lib/founder-journey/progress-tracker";

export function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<FounderOnboardingState | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = getFounderOnboardingState();
    if (s.currentStep === "ceo-briefing" && s.ceoBriefing.priorities.length === 0) {
      const prepared = prepareCeoBriefingStep(s);
      setState(prepared);
    } else {
      setState(s);
    }
  }, []);

  if (!state) {
    return (
      <FounderJourneyShell showBanner={false}>
        <Container className="fhis-onboarding-loading">Cargando onboarding…</Container>
      </FounderJourneyShell>
    );
  }

  const stepIdx = getFounderStepIndex(state.currentStep);
  const currentStepDef = FOUNDER_ONBOARDING_STEPS[stepIdx];
  const progress = computeJourneyProgress();
  const ceoContent = buildCeoWelcomeContent(state);

  function refresh() {
    setState(getFounderOnboardingState());
    setError("");
  }

  function handleBack() {
    const prev = getPrevFounderStep(state!.currentStep);
    if (prev) {
      goToFounderStep(prev);
      refresh();
    }
  }

  async function handleNext() {
    const validationError = validateFounderStep(state!.currentStep, state!);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (state!.currentStep === "ceo-briefing") {
      setLoading(true);
      const patched = {
        ...state!,
        ceoBriefing: { ...state!.ceoBriefing, acknowledged: true },
      };
      await syncProfileFromOnboarding(patched);
      const result = finalizeFounderJourney(patched);
      setLoading(false);
      router.push(`${result.nextRoute}?welcome=1&ventureId=${result.ventureId}`);
      return;
    }

    const patch: Partial<FounderOnboardingState> = {};
    if (state!.currentStep === "perfil") patch.profile = state!.profile;
    if (state!.currentStep === "empresa") patch.company = state!.company;
    if (state!.currentStep === "objetivos") patch.goals = state!.goals;
    if (state!.currentStep === "mercado") patch.market = state!.market;
    if (state!.currentStep === "primera-venture") patch.venture = state!.venture;

    const next = advanceFounderOnboarding(patch);
    if (next.currentStep === "ceo-briefing") {
      setState(prepareCeoBriefingStep(next));
    } else {
      setState(next);
    }
    setError("");
  }

  function addGoal() {
    if (!goalInput.trim()) return;
    setState({ ...state!, goals: [...state!.goals, goalInput.trim()].slice(0, 5) });
    setGoalInput("");
  }

  return (
    <FounderJourneyShell showBanner={false} showProgress>
      <Container className="fhis-onboarding">
        <SectionHeader
          title="Recorrido del fundador"
          description="Configura tu perfil, empresa y primera venture en 6 pasos"
        />

        <ProgressTracker progress={progress} />

        <div className="fhis-onboarding-steps">
          {FOUNDER_ONBOARDING_STEPS.map((step, i) => (
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
            Paso {stepIdx + 1} de {FOUNDER_ONBOARDING_STEPS.length}
          </Badge>
          <h2 className="fhis-onboarding-step-title">{currentStepDef.title}</h2>
          <p className="fhis-onboarding-step-desc">{currentStepDef.description}</p>

          {state.currentStep === "perfil" && (
            <Stack gap="md">
              <Input
                label="Nombre"
                value={state.profile.name}
                onChange={(e) =>
                  setState({ ...state, profile: { ...state.profile, name: e.target.value } })
                }
              />
              <Input
                label="Bio breve"
                value={state.profile.bio}
                onChange={(e) =>
                  setState({ ...state, profile: { ...state.profile, bio: e.target.value } })
                }
                placeholder="Ej: Fundador serial en SaaS B2B"
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

          {state.currentStep === "empresa" && (
            <Stack gap="md">
              <Input
                label="Nombre de empresa"
                value={state.company.companyName}
                onChange={(e) =>
                  setState({
                    ...state,
                    company: { ...state.company, companyName: e.target.value },
                  })
                }
              />
              <Input
                label="Industria"
                value={state.company.industry}
                onChange={(e) =>
                  setState({
                    ...state,
                    company: { ...state.company, industry: e.target.value },
                  })
                }
                placeholder="Ej: Fintech, HealthTech, EdTech"
              />
              <Select
                label="Tamaño del equipo"
                value={state.company.teamSize}
                onChange={(e) =>
                  setState({
                    ...state,
                    company: { ...state.company, teamSize: e.target.value },
                  })
                }
                options={[
                  { value: "1-5", label: "1-5 personas" },
                  { value: "6-20", label: "6-20 personas" },
                  { value: "21-50", label: "21-50 personas" },
                  { value: "50+", label: "Más de 50" },
                ]}
              />
            </Stack>
          )}

          {state.currentStep === "objetivos" && (
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

          {state.currentStep === "mercado" && (
            <Stack gap="md">
              <Select
                label="Categoría"
                value={state.market.category}
                onChange={(e) =>
                  setState({
                    ...state,
                    market: {
                      ...state.market,
                      category: e.target.value as FounderOnboardingState["market"]["category"],
                    },
                  })
                }
                options={APP_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              />
              <Input
                label="Audiencia objetivo"
                value={state.market.targetAudience}
                onChange={(e) =>
                  setState({
                    ...state,
                    market: { ...state.market, targetAudience: e.target.value },
                  })
                }
              />
              <Input
                label="Tamaño de mercado (estimado)"
                value={state.market.marketSize}
                onChange={(e) =>
                  setState({
                    ...state,
                    market: { ...state.market, marketSize: e.target.value },
                  })
                }
                placeholder="Ej: TAM $500M en LATAM"
              />
              <Input
                label="Competidores principales"
                value={state.market.competitors}
                onChange={(e) =>
                  setState({
                    ...state,
                    market: { ...state.market, competitors: e.target.value },
                  })
                }
              />
            </Stack>
          )}

          {state.currentStep === "primera-venture" && (
            <Stack gap="md">
              <Input
                label="Nombre de la venture"
                value={state.venture.name}
                onChange={(e) =>
                  setState({
                    ...state,
                    venture: { ...state.venture, name: e.target.value },
                  })
                }
              />
              <Input
                label="Idea (mín. 20 caracteres)"
                value={state.venture.idea}
                onChange={(e) =>
                  setState({
                    ...state,
                    venture: { ...state.venture, idea: e.target.value },
                  })
                }
                placeholder="Describe el problema que resuelves y para quién"
              />
              <Select
                label="Prioridad"
                value={state.venture.priority}
                onChange={(e) =>
                  setState({
                    ...state,
                    venture: {
                      ...state.venture,
                      priority: e.target.value as FounderOnboardingState["venture"]["priority"],
                    },
                  })
                }
                options={[
                  { value: "low", label: "Baja" },
                  { value: "medium", label: "Media" },
                  { value: "high", label: "Alta" },
                ]}
              />
            </Stack>
          )}

          {state.currentStep === "ceo-briefing" && (
            <CeoWelcomePanel
              content={ceoContent}
              acknowledged={state.ceoBriefing.acknowledged}
              onAcknowledgeChange={(v) =>
                setState({
                  ...state,
                  ceoBriefing: { ...state.ceoBriefing, acknowledged: v },
                })
              }
              showCta={false}
            />
          )}

          {error && <p className="fhis-auth-error">{error}</p>}

          <div className="fhis-onboarding-nav">
            <Button variant="ghost" onClick={handleBack} disabled={stepIdx === 0}>
              Atrás
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {loading
                ? "Finalizando…"
                : state.currentStep === "ceo-briefing"
                  ? "Completar y entrar al workspace"
                  : "Siguiente"}
            </Button>
          </div>
        </Panel>
      </Container>
    </FounderJourneyShell>
  );
}
