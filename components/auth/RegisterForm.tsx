"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { register } from "@/lib/auth";
import { useAuthOptional } from "./AuthProvider";

export function RegisterForm() {
  const router = useRouter();
  const auth = useAuthOptional();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const result = await register({ name, email, password, organizationName });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Error al registrarse");
      return;
    }
    setMessage(result.message ?? "Cuenta creada.");
    await auth?.refresh();
    router.push("/onboarding");
  }

  return (
    <form onSubmit={handleSubmit} className="fhis-auth-form">
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
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
        autoComplete="new-password"
        hint="Mínimo 8 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        label="Organización (opcional)"
        value={organizationName}
        onChange={(e) => setOrganizationName(e.target.value)}
      />
      {error && <p className="fhis-auth-error">{error}</p>}
      {message && <p className="fhis-auth-success">{message}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creando…" : "Crear cuenta"}
      </Button>
      <p className="fhis-auth-links">
        <Link href="/login">¿Ya tienes cuenta? Inicia sesión</Link>
      </p>
    </form>
  );
}
