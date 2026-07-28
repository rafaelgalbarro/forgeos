"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { login } from "@/lib/auth";
import { useAuthOptional } from "./AuthProvider";

export function LoginForm() {
  const router = useRouter();
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
    router.push("/workspace");
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
