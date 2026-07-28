"use client";

import { listAuditEntries, formatAuditAction } from "@/lib/enterprise/audit-log";
import { Panel } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import type { EnterpriseOrganization } from "@/lib/enterprise/types";

interface AuditLogTableProps {
  org?: EnterpriseOrganization;
}

export function AuditLogTable({ org }: AuditLogTableProps) {
  const entries = org ? listAuditEntries(org.id) : [];

  return (
    <Panel className="fhis-enterprise-step">
      <h3>7. Registro de auditoría</h3>
      <p className="fhis-enterprise-muted">{entries.length} eventos registrados</p>
      {entries.length === 0 ? (
        <p className="fhis-enterprise-muted">Sin eventos — ejecuta el flujo demo</p>
      ) : (
        <div className="fhis-enterprise-audit-wrap">
          <table className="fhis-enterprise-audit-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.timestamp).toLocaleString("es")}</td>
                  <td>{e.actorEmail}</td>
                  <td><Badge variant="default">{formatAuditAction(e.action)}</Badge></td>
                  <td><code>{e.resource}</code></td>
                  <td className="fhis-enterprise-muted">{e.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
