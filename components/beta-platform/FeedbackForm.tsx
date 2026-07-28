"use client";

import { useState, FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { submitBetaFeedback } from "@/lib/beta-platform";
import type { FeedbackCategory } from "@/lib/beta-platform";
import { readSession } from "@/lib/auth/session-store";

const CATEGORIES: { id: FeedbackCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature" },
  { id: "ux", label: "UX" },
  { id: "performance", label: "Rendimiento" },
];

interface FeedbackFormProps {
  compact?: boolean;
}

export function FeedbackForm({ compact }: FeedbackFormProps) {
  const pathname = usePathname() ?? "";
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [rating, setRating] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Escribe tu feedback.");
      return;
    }
    const session = readSession();
    submitBetaFeedback({
      message,
      category,
      page: pathname ?? "",
      rating: rating || undefined,
      userId: session?.userId,
      email: session?.email,
    });
    setDone(true);
    setMessage("");
  }

  if (done) {
    return (
      <Panel className="fhis-beta-feedback-success">
        <p className="fhis-feedback-thanks">¡Gracias por tu feedback! Lo revisaremos pronto.</p>
        <Button size="sm" variant="ghost" onClick={() => setDone(false)}>
          Enviar otro
        </Button>
      </Panel>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "fhis-beta-feedback-compact" : "fhis-beta-feedback-form"}>
      <Stack gap="md">
        <div className="fhis-feedback-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`fhis-feedback-cat${category === cat.id ? " fhis-feedback-cat-active" : ""}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {!compact && (
          <div className="fhis-beta-feedback-rating">
            <span className="fhis-beta-feedback-rating-label">Valoración (opcional)</span>
            <div className="fhis-beta-feedback-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`fhis-beta-star${rating >= n ? " fhis-beta-star-active" : ""}`}
                  onClick={() => setRating(n)}
                  aria-label={`${n} estrellas`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        )}
        <textarea
          className="fhis-feedback-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntanos qué piensas, qué mejorarías o qué bug encontraste…"
          rows={compact ? 3 : 5}
        />
        {error && <p className="fhis-input-error">{error}</p>}
        <Button type="submit">Enviar feedback</Button>
      </Stack>
    </form>
  );
}
