"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { submitBetaSignup } from "@/lib/launch/beta-signup";
import { trackBetaSignup, trackCtaClick } from "@/lib/launch/analytics-hooks";

interface BetaSignupFormProps {
  redirectTo?: string;
  compact?: boolean;
}

export function BetaSignupForm({ redirectTo = "/onboarding", compact }: BetaSignupFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }
    if (!email.includes("@")) {
      setError("Introduce un email válido.");
      return;
    }
    setSubmitting(true);
    trackCtaClick("beta_signup_submit");
    submitBetaSignup({ name, email, company, useCase });
    trackBetaSignup(email);
    setDone(true);
    setSubmitting(false);
    setTimeout(() => router.push(redirectTo), 800);
  }

  if (done) {
    return (
      <Panel className="fhis-beta-signup-success">
        <p className="fhis-beta-signup-success-title">¡Bienvenido a la beta!</p>
        <p className="fhis-beta-signup-success-sub">Redirigiendo al onboarding…</p>
      </Panel>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "fhis-beta-signup-compact" : "fhis-beta-signup-form"}>
      <Stack gap="md">
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
        {!compact && (
          <>
            <Input
              label="Empresa (opcional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Tu empresa o proyecto"
            />
            <Input
              label="¿Qué quieres construir?"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="Ej: SaaS B2B para logística"
            />
          </>
        )}
        {error && <p className="fhis-input-error">{error}</p>}
        <Button type="submit" loading={submitting} className="fhis-beta-signup-cta">
          Solicitar acceso beta
        </Button>
        <p className="fhis-beta-signup-hint">
          Sin pagos ni emails reales en RC12. Acceso instantáneo en local.
        </p>
      </Stack>
    </form>
  );
}
