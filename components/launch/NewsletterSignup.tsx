"use client";

import { useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { subscribeNewsletter, isNewsletterSubscribed } from "@/lib/forgeos-launch";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "duplicate">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (isNewsletterSubscribed(email)) {
      setStatus("duplicate");
      return;
    }
    subscribeNewsletter(email);
    setStatus("success");
    setEmail("");
  }

  return (
    <Panel className="fhis-newsletter-signup">
      <Stack gap="md">
        <p>Suscríbete para recibir novedades del lanzamiento. Almacenamiento local (stub).</p>
        <form onSubmit={handleSubmit} className="fhis-newsletter-form">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus("idle");
            }}
            placeholder="tu@email.com"
            className="fhis-input"
            required
          />
          <button type="submit" className="fhis-btn fhis-btn-primary fhis-btn-sm">
            Suscribirse
          </button>
        </form>
        {status === "success" && (
          <Badge variant="accent">¡Gracias! Te avisaremos en el lanzamiento.</Badge>
        )}
        {status === "duplicate" && (
          <Badge variant="default">Ya estás suscrito con este email.</Badge>
        )}
      </Stack>
    </Panel>
  );
}
