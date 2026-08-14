"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { login } from "@/lib/auth";
import { useAuthOptional } from "./AuthProvider";

/** Allow only same-origin relative paths (open-redirect safe). */
function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return "/workspace";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return "/workspace";
  return raw;
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuthOptional();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Error al iniciar sesión");
      return;
    }
    await auth?.refresh();
    const redirect = searchParams ? searchParams.get("redirect") : null;
    router.push(safeRedirectPath(redirect));
  }

  return (
    <form onSubmit={handleSubmit} className="fhis-auth-form">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="fhis-auth-error">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Entrando…" : "Iniciar sesión"}
      </Button>
      <p className="fhis-auth-links">
        <Link href="/forgot-password">¿Olvidaste tu contraseña?</Link>
        {" · "}
        <Link href="/register">Crear cuenta</Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="fhis-auth-links">Cargando…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
