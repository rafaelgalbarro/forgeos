"use client";

import clsx from "clsx";
import type { DiscoveryAnswerMap, DiscoveryQuestion, DiscoveryResult } from "@/lib/discovery/types";
import { countAnsweredQuestions, createDiscoveryAnswer } from "@/lib/discovery/discovery-context";
import { Badge } from "@/components/ui/fhis/Badge";
import { Input } from "@/components/ui/fhis/Input";
import { Panel } from "@/components/ui/fhis/Layout";
import { Progress } from "@/components/ui/fhis/Progress";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface DiscoveryPanelProps {
  discovery: DiscoveryResult | null;
  answers: DiscoveryAnswerMap;
  onAnswersChange: (answers: DiscoveryAnswerMap) => void;
}

function answerValue(answers: DiscoveryAnswerMap, questionId: string): string | string[] | undefined {
  return answers[questionId]?.answer;
}

export function DiscoveryPanel({ discovery, answers, onAnswersChange }: DiscoveryPanelProps) {
  if (!discovery || discovery.questions.length === 0) return null;

  const { classification, questions } = discovery;
  const { answered, total } = countAnsweredQuestions(questions, answers);

  function setAnswer(question: DiscoveryQuestion, answer: string | string[]) {
    const next = { ...answers };
    const trimmed = Array.isArray(answer)
      ? answer.filter((v) => v.trim().length > 0)
      : answer.trim();

    if ((Array.isArray(trimmed) && trimmed.length === 0) || (typeof trimmed === "string" && !trimmed)) {
      delete next[question.id];
    } else {
      next[question.id] = createDiscoveryAnswer(question, trimmed);
    }
    onAnswersChange(next);
  }

  function toggleMultiple(question: DiscoveryQuestion, option: string) {
    const current = answerValue(answers, question.id);
    const selected = Array.isArray(current) ? [...current] : current ? [current] : [];
    const next = selected.includes(option)
      ? selected.filter((o) => o !== option)
      : [...selected, option];
    setAnswer(question, next);
  }

  return (
    <Panel className="discovery-panel">
      <SectionHeader
        title="ForgeOS necesita aclarar esto antes de construir"
        description={`${classification.productType} · ${classification.probableBusinessModel} · ${discovery.scoreLabel}`}
      />

      <Progress value={answered} max={total} label={`${answered} de ${total} decisiones aclaradas`} showValue />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)", margin: "var(--fhis-space-4) 0" }}>
        <Badge variant="default">{classification.marketType}</Badge>
        <Badge variant="default">{classification.probableCustomer}</Badge>
        {classification.channels.map((ch) => (
          <Badge key={ch} variant="blue">{ch}</Badge>
        ))}
      </div>

      <ol className="discovery-questions-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {questions.map((item) => {
          const value = answerValue(answers, item.id);
          const isAnswered = value !== undefined && (Array.isArray(value) ? value.length > 0 : String(value).trim().length > 0);

          return (
            <li
              key={item.id}
              className={clsx(
                "discovery-question",
                `discovery-priority-${item.priority}`,
                isAnswered && "discovery-question-answered"
              )}
              style={{ marginBottom: "var(--fhis-space-5)" }}
            >
              <p className="discovery-question-text">{item.question}</p>
              <p className="discovery-question-reason" style={{ color: "var(--fhis-color-text-muted)", fontSize: "var(--fhis-text-sm)" }}>
                {item.reason}
              </p>

              {item.type === "free_text" && (
                <Input
                  placeholder="Tu respuesta..."
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setAnswer(item, e.target.value)}
                />
              )}

              {item.type === "single_choice" && item.options && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)", marginTop: "var(--fhis-space-2)" }}>
                  {item.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={clsx(
                        "fhis-discovery-chip-btn",
                        value === opt && "fhis-discovery-chip-btn-selected"
                      )}
                      onClick={() => setAnswer(item, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {item.type === "multiple_choice" && item.options && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)", marginTop: "var(--fhis-space-2)" }}>
                  {item.options.map((opt) => {
                    const selected = Array.isArray(value) ? value.includes(opt) : value === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={clsx(
                          "fhis-discovery-chip-btn",
                          selected && "fhis-discovery-chip-btn-selected"
                        )}
                        onClick={() => toggleMultiple(item, opt)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p style={{ margin: 0, fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
        Tus respuestas refinan Intelligence, Research y Product antes de construir.
      </p>
    </Panel>
  );
}
