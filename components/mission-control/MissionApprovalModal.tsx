"use client";

import { Dialog } from "@/components/ui/fhis/Dialog";
import type { ApprovalGate } from "@/lib/mission-control/autonomous-build/types";
import { approvalReasonLabel } from "@/lib/mission-control/autonomous-build/approval-gates";

interface Props {
  gate: ApprovalGate | null;
  onApprove: () => void;
  onReject: () => void;
}

export function MissionApprovalModal({ gate, onApprove, onReject }: Props) {
  if (!gate) return null;

  return (
    <Dialog
      open={!!gate && !gate.resolved}
      title={gate.title}
      onClose={onReject}
      onConfirm={onApprove}
      confirmLabel="Autorizar"
      cancelLabel="Cancelar"
    >
      <p style={{ fontSize: "0.875rem", marginBottom: 8 }}>{gate.description}</p>
      <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
        Tarea: <strong>{gate.taskLabel}</strong>
      </p>
      <p style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", marginTop: 8 }}>
        Tipo: {approvalReasonLabel(gate.reason)}
      </p>
    </Dialog>
  );
}
