"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { getVentures } from "@/lib/store/ventures";
import { setActiveWorkspace } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/workspace";
import { useAuth } from "./AuthProvider";
import { FounderJourneyShell } from "@/components/founder-journey/FounderJourneyShell";
import { WelcomeDashboard } from "@/components/founder-journey/WelcomeDashboard";
import { ProgressTracker } from "@/components/founder-journey/ProgressTracker";
import { buildWelcomeDashboard } from "@/lib/founder-journey/welcome-dashboard";
import { computeJourneyProgress } from "@/lib/founder-journey/progress-tracker";
import { getPostWorkspaceRoute } from "@/lib/founder-journey/journey-manager";

function WorkspaceViewInner() {
  const { session, workspace, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams?.get("welcome") === "1";
  const ventureId = searchParams?.get("ventureId");

  const welcomeData = useMemo(() => buildWelcomeDashboard(), []);
  const progress = useMemo(() => computeJourneyProgress(), []);

  if (!session) {
    return (
      <Container>
        <p>Inicia sesión para acceder a tu workspace.</p>
        <Link href="/login">Login</Link>
      </Container>
    );
  }

  const workspaces = getUserWorkspaces(session.userId);
  const ventures = getVentures().filter((v) =>
    workspace?.ventureIds.includes(v.id)
  );

  async function switchWorkspace(id: string) {
    setActiveWorkspace(id);
    await refresh();
  }

  return (
    <FounderJourneyShell showProgress>
      <Container>
        {showWelcome && (
          <Panel className="fhis-fj-welcome-banner">
            <Badge variant="accent">Onboarding completado</Badge>
            <p>Tu primera venture está lista. Continúa en ForgeOS o revisa el Founder Journey.</p>
            {ventureId && (
              <Link href={`/founder-journey?ventureId=${ventureId}`}>
                Ver Founder Journey →
              </Link>
            )}
          </Panel>
        )}

        <WelcomeDashboard data={welcomeData} />

        <Stack gap="lg" style={{ marginTop: "var(--fhis-space-8)" }}>
          <ProgressTracker progress={progress} />

          <Panel>
            <SectionHeader title="Workspace activo" />
            {workspace ? (
              <>
                <p className="fhis-ws-name">{workspace.workspaceName}</p>
                <p className="fhis-ws-meta">
                  Organización: <strong>{workspace.organizationName}</strong>
                </p>
                <p className="fhis-ws-meta">ID: {workspace.workspaceId}</p>
                <Badge variant="blue">IA scoped a este workspace</Badge>
              </>
            ) : (
              <p>No hay workspace activo.</p>
            )}
          </Panel>

          {workspaces.length > 1 && (
            <Panel>
              <h3>Cambiar workspace</h3>
              <ul className="fhis-ws-list">
                {workspaces.map((ws) => (
                  <li key={ws.id}>
                    <button type="button" onClick={() => switchWorkspace(ws.id)}>
                      {ws.name}
                      {ws.id === session.activeWorkspaceId && " (activo)"}
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel>
            <h3>Ventures en workspace</h3>
            {ventures.length === 0 ? (
              <p>Sin ventures vinculados. Completa el onboarding o crea uno desde Venture Factory.</p>
            ) : (
              <ul className="fhis-ws-list">
                {ventures.map((v) => (
                  <li key={v.id}>
                    <Link href={`/venture/${v.id}`}>{v.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="fhis-auth-actions">
            <Button onClick={() => router.push(getPostWorkspaceRoute())}>Abrir ForgeOS →</Button>
            <Link href="/venture-factory">Venture Factory</Link>
            <Link href="/profile">Perfil</Link>
          </div>
        </Stack>
      </Container>
    </FounderJourneyShell>
  );
}

export function WorkspaceView() {
  return (
    <Suspense fallback={<Container>Cargando workspace…</Container>}>
      <WorkspaceViewInner />
    </Suspense>
  );
}
