"use client";

import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";
import { Button } from "./Button";

interface DialogProps extends FhisClassNameProps, FhisChildrenProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  className,
}: DialogProps) {
  if (!open) return null;

  return (
    <div className="fhis-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className={cn("fhis-dialog", className)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fhis-dialog-title"
      >
        <div className="fhis-dialog-title" id="fhis-dialog-title">
          {title}
        </div>
        <div className="fhis-dialog-body">{children}</div>
        <div className="fhis-dialog-actions">
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          {onConfirm && (
            <Button variant="primary" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
