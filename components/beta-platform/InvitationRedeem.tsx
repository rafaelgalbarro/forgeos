"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { redeemInvitation, hasRedeemedInvitation, getInvitationRedemption } from "@/lib/beta-platform";
import { trackBetaEvent } from "@/lib/beta-platform/analytics";

interface InvitationRedeemProps {
  onRedeemed?: () => void;
}

export function InvitationRedeem({ onRedeemed }: InvitationRedeemProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const alreadyRedeemed = typeof window !== "undefined" && hasRedeemedInvitation();
  const redemption = typeof window !== "undefined" ? getInvitationRedemption() : null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("Introduce un código de invitación.");
      return;
    }
    setSubmitting(true);
    const result = redeemInvitation(code);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Error al canjear.");
      return;
    }
    trackBetaEvent({ event: "invitation_redeem", meta: { code: code.trim().toUpperCase() } });
    setDone(true);
    onRedeemed?.();
  }

  if (alreadyRedeemed || done) {
    return (
      <Panel className="fhis-beta-invite-redeemed">
        <p className="fhis-beta-invite-success-title">Invitación canjeada</p>
        <p className="fhis-beta-signup-hint">
          Código: <strong>{redemption?.code ?? code.toUpperCase()}</strong>
        </p>
        <Link href="/login" className="fhis-btn fhis-btn-primary fhis-btn-sm">
          Crear cuenta →
        </Link>
      </Panel>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="fhis-beta-invite-form">
      <Stack gap="md">
        <Input
          label="Código de invitación"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="FORGE-BETA-2026"
        />
        {error && <p className="fhis-input-error">{error}</p>}
        <Button type="submit" loading={submitting}>
          Canjear invitación
        </Button>
        <p className="fhis-beta-signup-hint">Demo: FORGE-BETA-2026 o FORGE-FOUNDER-VIP</p>
      </Stack>
    </form>
  );
}
