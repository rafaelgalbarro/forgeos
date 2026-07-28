"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/fhis/Button";
import { Input } from "@/components/ui/fhis/Input";
import { Panel } from "@/components/ui/fhis/Layout";
import { submitFeedback } from "@/lib/launch/feedback-widget";
import { trackFeedbackSubmit } from "@/lib/launch/analytics-hooks";
import type { FeedbackRecord } from "@/lib/launch/types";

export function FeedbackWidget() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<FeedbackRecord["category"]>("general");
  const [sent, setSent] = useState(false);

  const launchPaths = ["/landing", "/pricing", "/onboarding", "/docs", "/beta", "/waitlist", "/feedback", "/status", "/support", "/privacy", "/security"];
  const showOnLaunch = launchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const showOnOs = pathname === "/os" || pathname.startsWith("/os/");

  useEffect(() => {
    if (!open) setSent(false);
  }, [open]);

  if (!showOnLaunch && !showOnOs) return null;

  function handleSubmit() {
    if (!message.trim()) return;
    submitFeedback({ message, category, page: pathname });
    trackFeedbackSubmit(category);
    setSent(true);
    setMessage("");
    setTimeout(() => setOpen(false), 1500);
  }

  return (
    <div className="fhis-feedback-widget">
      {open && (
        <Panel className="fhis-feedback-panel">
          {sent ? (
            <p className="fhis-feedback-thanks">¡Gracias por tu feedback!</p>
          ) : (
            <>
              <p className="fhis-feedback-title">Enviar feedback</p>
              <div className="fhis-feedback-categories">
                {(["general", "bug", "feature"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`fhis-feedback-cat${category === cat ? " fhis-feedback-cat-active" : ""}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat === "general" ? "General" : cat === "bug" ? "Bug" : "Feature"}
                  </button>
                ))}
              </div>
              <textarea
                className="fhis-feedback-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos qué piensas…"
                rows={3}
              />
              <div className="fhis-feedback-actions">
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  Enviar
                </Button>
              </div>
            </>
          )}
        </Panel>
      )}
      <button
        type="button"
        className="fhis-feedback-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label="Feedback"
      >
        💬
      </button>
    </div>
  );
}
