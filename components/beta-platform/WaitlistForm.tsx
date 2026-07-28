"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { joinWaitlist, getWaitlistEntry, estimateWaitDays } from "@/lib/beta-platform";
import { trackBetaEvent } from "@/lib/beta-platform/analytics";

interface WaitlistFormProps {
  redirectTo?: string;
  compact?: boolean;
  onJoined?: () => void;
}

export function WaitlistForm({ redirectTo = "/beta", compact, onJoined }: WaitlistFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  const existing = typeof window !== "undefined" ? getWaitlistEntry() : null;

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
    const entry = joinWaitlist({ name, email, company, useCase });
    trackBetaEvent({ event: "waitlist_join", meta: { position: String(entry.queuePosition) } });
    setPosition(entry.queuePosition);
    setDone(true);
    setSubmitting(false);
    onJoined?.();
    if (redirectTo) {
      setTimeout(() => router.push(redirectTo), 1200);
    }
  }

  if (existing && !done) {
    return (
      <Panel className="fhis-beta-waitlist-existing">
        <p className="fhis-beta-waitlist-success-title">Ya estás en la waitlist</p>
        <p className="fhis-beta-waitlist-position">
          Posición <strong>#{existing.queuePosition}</strong> · ~{estimateWaitDays(existing.queuePosition)} días estimados
        </p>
        <p className="fhis-beta-signup-hint">
          Canjea tu código de invitación en el dashboard beta.
        </p>
      </Panel>
    );
  }

  if (done) {
    return (
      <Panel className="fhis-beta-waitlist-success">
        <p className="fhis-beta-waitlist-success-title">¡Estás en la waitlist!</p>
        {position && (
          <p className="fhis-beta-waitlist-position">
            Posición <strong>#{position}</strong> · ~{estimateWaitDays(position)} días estimados
          </p>
        )}
        <p className="fhis-beta-signup-success-sub">Redirigiendo al dashboard beta…</p>
      </Panel>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "fhis-beta-signup-compact" : "fhis-beta-waitlist-form"}>
      <Stack gap="md">
        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
        {!compact && (
          <>
            <Input label="Empresa (opcional)" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Tu empresa o proyecto" />
            <Input label="¿Qué quieres construir?" value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder="Ej: SaaS B2B para logística" />
          </>
        )}
        {error && <p className="fhis-input-error">{error}</p>}
        <Button type="submit" loading={submitting} className="fhis-beta-signup-cta">
          Unirme a la waitlist
        </Button>
        <p className="fhis-beta-signup-hint">Sin emails reales. Demo local con códigos de invitación.</p>
      </Stack>
    </form>
  );
}
