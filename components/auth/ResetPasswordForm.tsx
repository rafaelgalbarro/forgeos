"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { findUserByEmail, hashPassword, saveStoredUser } from "@/lib/workspace/store";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!token) {
      setError("Falta el token de recuperación en el enlace.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; email?: string };
      if (!res.ok || !data.success || !data.email) {
        setError(data.message ?? "Token inválido o expirado.");
        setLoading(false);
        return;
      }

      const user = findUserByEmail(data.email);
      if (!user) {
        setError(
          "No hay una cuenta local en este navegador para ese email. Inicia sesión o regístrate en el dispositivo donde creaste la cuenta.",
        );
        setLoading(false);
        return;
      }

      user.passwordHash = await hashPassword(password);
      user.updatedAt = new Date().toISOString();
      saveStoredUser(user);
      setMessage("Contraseña actualizada. Redirigiendo al login…");
      window.setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="fhis-auth-form">
      {!token ? (
        <p className="fhis-auth-error">
          Enlace incompleto. Solicita uno nuevo desde{" "}
          <Link href="/forgot-password">recuperar contraseña</Link>.
        </p>
      ) : null}
      <Input
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />
      <Input
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        minLength={8}
      />
      {error ? <p className="fhis-auth-error">{error}</p> : null}
      {message ? <p className="fhis-auth-success">{message}</p> : null}
      <Button type="submit" disabled={loading || !token}>
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
      <p className="fhis-auth-links">
        <Link href="/login">Volver a login</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<p className="fhis-auth-links">Cargando…</p>}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
