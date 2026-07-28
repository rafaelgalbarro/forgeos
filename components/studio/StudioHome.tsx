"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { previewIntelligence, generateForgeIntelligenceReport } from "@/lib/intelligence";
import { previewDiscovery } from "@/lib/discovery";
import { buildDiscoveryContext } from "@/lib/discovery/discovery-context";
import {
  getDiscoveryAnswers,
  getOrCreateDraftId,
  migrateDiscoveryAnswers,
  saveDiscoveryAnswers,
} from "@/lib/discovery/discovery-answers-store";
import type { DiscoveryAnswerMap } from "@/lib/discovery/types";
import { createVentureDraft } from "@/lib/domain/venture";
import { saveVenture } from "@/lib/store/ventures";
import type { IntelligencePreview } from "@/lib/intelligence/types";
import type { DiscoveryResult } from "@/lib/discovery/types";
import { Button } from "@/components/ui/fhis/Button";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Container } from "@/components/ui/fhis/Layout";
import { RotatingPlaceholder } from "./RotatingPlaceholder";
import { AnalysisPanel } from "./AnalysisPanel";
import { FounderAdvisorPanel } from "./FounderAdvisorPanel";
import { DiscoveryPanel } from "./DiscoveryPanel";

export function StudioHome() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [preview, setPreview] = useState<IntelligencePreview | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [answers, setAnswers] = useState<DiscoveryAnswerMap>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = getOrCreateDraftId();
    setDraftId(id);
    setAnswers(getDiscoveryAnswers(id));
  }, []);

  const discoveryContext = useMemo(
    () => buildDiscoveryContext(idea, discovery, answers),
    [idea, discovery, answers]
  );

  const runPreview = useCallback(
    (text: string, context = discoveryContext) => {
      setPreview(previewIntelligence(text, context));
      setDiscovery(previewDiscovery(text));
    },
    [discoveryContext]
  );

  useEffect(() => {
    const timer = setTimeout(() => runPreview(idea), 200);
    return () => clearTimeout(timer);
  }, [idea, runPreview]);

  useEffect(() => {
    if (idea.trim().length >= 8) {
      setPreview(previewIntelligence(idea, discoveryContext));
    }
  }, [answers, discoveryContext, idea]);

  function handleAnswersChange(next: DiscoveryAnswerMap) {
    setAnswers(next);
    if (draftId) {
      saveDiscoveryAnswers(draftId, next);
    }
  }

  function handleBuild() {
    const context = buildDiscoveryContext(idea.trim(), discovery, answers);
    const report = generateForgeIntelligenceReport({
      ideaText: idea.trim(),
      discoveryContext: context,
    });
    if (!report) return;
    setSubmitting(true);
    const venture = createVentureDraft({
      ideaText: idea.trim(),
      intelligenceReport: report,
      discoveryAnswers: answers,
      discoveryContext: context,
    });
    saveVenture(venture);
    if (draftId) {
      migrateDiscoveryAnswers(draftId, venture.id);
    }
    router.push(`/intelligence/${venture.id}`);
  }

  return (
    <div className="studio">
      <header className="studio-header">
        <Link href="/" className="fhis-sidebar-logo">Forge<span>OS</span></Link>
        <nav className="studio-nav">
          <Link href="/projects">Empresas</Link>
        </nav>
      </header>

      <Container>
        <main className="studio-main">
          <SectionHeader
            title="¿Qué quieres construir hoy?"
            description="Describe una idea. ForgeOS diseñará el producto, el negocio, la arquitectura y la estrategia de lanzamiento."
          />

          <div className="studio-composer-layout">
            <div className="studio-composer-col">
              <div className="fhis-studio-composer">
                <textarea
                  className="fhis-composer-input"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  rows={5}
                  aria-label="Describe tu idea"
                />
                {!idea && (
                  <div className="fhis-composer-placeholder" aria-hidden>
                    <RotatingPlaceholder />
                  </div>
                )}
                <div className="composer-footer">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={handleBuild}
                    disabled={idea.trim().length < 15 || submitting}
                    loading={submitting}
                  >
                    {submitting ? "Analizando..." : "Construir Startup →"}
                  </Button>
                </div>
              </div>

              <DiscoveryPanel
                discovery={discovery}
                answers={answers}
                onAnswersChange={handleAnswersChange}
              />
              <FounderAdvisorPanel advisor={preview?.founderAdvisor ?? null} />
            </div>

            <AnalysisPanel preview={preview} />
          </div>
        </main>
      </Container>
    </div>
  );
}
