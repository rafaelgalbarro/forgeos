"use client";

import { useState } from "react";
import type { ChangeRequest, CreationOutput } from "@/lib/creation-output/types";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { createChangeRequest, approveOutput } from "@/lib/creation-output/change-requests";
import { registerOutput } from "@/lib/creation-output/output-registry";

interface Props {
  output: CreationOutput;
  changeRequests: ChangeRequest[];
  onOutputChange: (output: CreationOutput) => void;
  onChangeRequestCreated: (cr: ChangeRequest) => void;
}

export function StudioActionsPanel({
  output,
  changeRequests,
  onOutputChange,
  onChangeRequestCreated,
}: Props) {
  const [changeText, setChangeText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleChangeRequest = () => {
    if (!changeText.trim()) return;
    const { changeRequest, newVersion } = createChangeRequest(output, changeText, ["preview", "structure"]);
    onOutputChange(newVersion);
    onChangeRequestCreated(changeRequest);
    setChangeText("");
    setShowForm(false);
  };

  const handleApprove = () => {
    const approved = approveOutput(output);
    onOutputChange(approved);
  };

  const handleExportReady = () => {
    const updated = { ...output, status: "EXPORT_READY" as const, updatedAt: new Date().toISOString() };
    registerOutput(updated);
    onOutputChange(updated);
  };

  const openRequests = changeRequests.filter((cr) => cr.outputId === output.outputId || cr.previousVersionId === output.outputId);

  return (
    <Panel>
      <SectionHeader title="Decisiones y acciones" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {output.status !== "APPROVED" && (
          <button type="button" className="fhis-btn fhis-btn-primary fhis-btn-sm" onClick={handleApprove}>
            Aprobar
          </button>
        )}
        <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={() => setShowForm(!showForm)}>
          Solicitar cambios
        </button>
        <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={handleExportReady}>
          Marcar export ready
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={changeText}
            onChange={(e) => setChangeText(e.target.value)}
            placeholder="Describe los cambios solicitados…"
            rows={3}
            style={{ width: "100%", fontSize: "0.85rem", padding: 8, borderRadius: 6, border: "1px solid var(--fhis-color-border)" }}
          />
          <button type="button" className="fhis-btn fhis-btn-primary fhis-btn-sm" style={{ marginTop: 8 }} onClick={handleChangeRequest}>
            Enviar solicitud
          </button>
        </div>
      )}

      {openRequests.length > 0 && (
        <div style={{ fontSize: "0.8rem" }}>
          <strong>Change requests:</strong>
          <ul>
            {openRequests.map((cr) => (
              <li key={cr.id}>{cr.description.slice(0, 80)} — {cr.status}</li>
            ))}
          </ul>
        </div>
      )}

      {output.warnings.length > 0 && (
        <div style={{ marginTop: 12, fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
          {output.warnings.map((w) => (
            <div key={w.id}>⚠ {w.message}</div>
          ))}
        </div>
      )}
    </Panel>
  );
}
