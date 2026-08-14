"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";

/**
 * Requests a Resend password-reset email via /api/auth/forgot-password.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        setError(data.message ?? "No se pudo enviar el email.");
      } else {
        setMessage(data.message ?? "Revisa tu bandeja de entrada.");
      }
    } catch {
      setError("Error de red al solicitar el reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fhis-auth-form">
      <form onSubmit={handleForgot}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Enviando…" : "Enviar enlace de recuperación"}
        </Button>
      </form>
      {error ? <p className="fhis-auth-error">{error}</p> : null}
      {message ? <p className="fhis-auth-success">{message}</p> : null}
      <p className="fhis-auth-links">
        <Link href="/login">Volver a login</Link>
        {" · "}
        <Link href="/register">Crear cuenta</Link>
      </p>
    </div>
  );
}
