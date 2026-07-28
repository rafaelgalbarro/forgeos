"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { forgotPassword, verifyEmail } from "@/lib/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [demoToken, setDemoToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    setMessage(result.message);
    setDemoToken(result.demoToken);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    const result = await verifyEmail(token.trim());
    setLoading(false);
    setMessage(result.message);
  }

  return (
    <div className="fhis-auth-form">
      <form onSubmit={handleForgot}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading}>
          Enviar instrucciones
        </Button>
      </form>
      <hr className="fhis-auth-divider" />
      <form onSubmit={handleVerify}>
        <Input
          label="Token verificación email (demo)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          hint="Pega el token recibido al registrarte"
        />
        <Button type="submit" variant="secondary" disabled={loading}>
          Verificar email
        </Button>
      </form>
      {demoToken && (
        <p className="fhis-auth-hint">
          Token demo reset: <code>{demoToken}</code>
        </p>
      )}
      {message && <p className="fhis-auth-success">{message}</p>}
      <p className="fhis-auth-links">
        <Link href="/login">Volver a login</Link>
      </p>
    </div>
  );
}
