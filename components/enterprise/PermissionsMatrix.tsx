"use client";

import { buildPermissionMatrix } from "@/lib/enterprise/permissions-engine";
import { listRoles } from "@/lib/enterprise/rbac-engine";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";

export function PermissionsMatrix() {
  const matrix = buildPermissionMatrix();
  const roles = listRoles();

  return (
    <Panel className="fhis-enterprise-step">
      <h3>4. Matriz de permisos RBAC</h3>
      <p className="fhis-enterprise-muted">Roles enterprise — demo sandbox</p>
      <div className="fhis-enterprise-matrix-wrap">
        <table className="fhis-enterprise-matrix">
          <thead>
            <tr>
              <th>Permiso</th>
              {roles.map((r) => (
                <th key={r.role}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.permission}>
                <td>{row.label}</td>
                {roles.map((r) => (
                  <td key={r.role} className="fhis-enterprise-matrix-cell">
                    {row.roles[r.role] ? (
                      <Badge variant="accent">✓</Badge>
                    ) : (
                      <span className="fhis-enterprise-muted">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
