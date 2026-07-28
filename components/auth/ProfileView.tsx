"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import { updateProfile } from "@/lib/auth";
import { useAuth } from "./AuthProvider";

export function ProfileView() {
  const { session, refresh, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(session?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(session?.avatarUrl ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!session) {
    return (
      <Container>
        <p>Inicia sesión para ver tu perfil.</p>
        <Link href="/login">Ir a login</Link>
      </Container>
    );
  }

  const userId = session.userId;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const result = await updateProfile(userId, { name, avatarUrl });
    if (!result.success) {
      setError(result.error ?? "Error");
      return;
    }
    setMessage("Perfil actualizado.");
    await refresh();
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Container>
      <SectionHeader title="Perfil" subtitle="Tu identidad en ForgeOS" />
      <Stack gap="lg">
        <Panel>
          <div className="fhis-profile-header">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="fhis-profile-avatar-img" />
            ) : (
              <div className="fhis-profile-avatar">{initials}</div>
            )}
            <div>
              <h2>{session.name}</h2>
              <p>{session.email}</p>
              <Badge variant={session.emailVerified === "verified" ? "accent" : "amber"}>
                {session.emailVerified === "verified" ? "Email verificado" : "Email pendiente"}
              </Badge>
            </div>
          </div>
        </Panel>
        <Panel>
          <form onSubmit={handleSave} className="fhis-auth-form">
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="Avatar URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              hint="URL de imagen"
            />
            {error && <p className="fhis-auth-error">{error}</p>}
            {message && <p className="fhis-auth-success">{message}</p>}
            <Button type="submit">Guardar</Button>
          </form>
        </Panel>
        <div className="fhis-auth-actions">
          <Link href="/settings">Preferencias</Link>
          <Link href="/workspace">Workspace</Link>
          <Button variant="ghost" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </Stack>
    </Container>
  );
}
