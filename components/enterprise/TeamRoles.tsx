"use client";

import { useState } from "react";
import { createTeam, listTeams, addTeamMember } from "@/lib/enterprise/team-engine";
import { listUsers, inviteUser } from "@/lib/enterprise/user-engine";
import { DEMO_ROLES } from "@/lib/enterprise/demo-flow";
import { Input } from "@/components/ui/fhis/Input";
import { Button } from "@/components/ui/fhis/Button";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import type { EnterpriseOrganization } from "@/lib/enterprise/types";

interface TeamRolesProps {
  org?: EnterpriseOrganization;
  onComplete: () => void;
}

export function TeamRoles({ org, onComplete }: TeamRolesProps) {
  const [teamName, setTeamName] = useState("Producto");
  const teams = org ? listTeams(org.id) : [];
  const users = org ? listUsers(org.id) : [];

  function handleCreateTeam() {
    if (!org) return;
    createTeam(teamName, "Equipo de producto y ventures", org.id);
    onComplete();
  }

  function handleSeedUsers() {
    if (!org) return;
    DEMO_ROLES.forEach((d) => inviteUser(d.email, d.name, d.role, org.id));
    const team = teams[0] ?? createTeam("Producto", "Equipo demo", org.id);
    const member = listUsers(org.id).find((u) => u.role === "member");
    if (member) addTeamMember(team.id, member.id);
    onComplete();
  }

  return (
    <Panel className="fhis-enterprise-step">
      <h3>2–3. Equipos y roles</h3>

      {teams.length === 0 ? (
        <div className="fhis-enterprise-form">
          <Input label="Nombre del equipo" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          <Button onClick={handleCreateTeam} disabled={!org}>Crear equipo</Button>
        </div>
      ) : (
        <div className="fhis-enterprise-list">
          {teams.map((t) => (
            <div key={t.id} className="fhis-enterprise-list-item">
              <strong>{t.name}</strong>
              <span className="fhis-enterprise-muted">{t.memberIds.length} miembros</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="fhis-enterprise-step-head">
          <h4>Usuarios y roles</h4>
          {users.length < 3 && (
            <Button size="sm" variant="secondary" onClick={handleSeedUsers} disabled={!org}>
              Añadir usuarios demo
            </Button>
          )}
        </div>
        {users.length === 0 ? (
          <p className="fhis-enterprise-muted">Sin usuarios — añade el equipo demo</p>
        ) : (
          <div className="fhis-enterprise-list">
            {users.map((u) => (
              <div key={u.id} className="fhis-enterprise-list-item">
                <span>{u.name} <span className="fhis-enterprise-muted">({u.email})</span></span>
                <Badge variant="default">{u.role}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
