import Link from "next/link";
import { loadMissionControlVM } from "@/src/presentation";
import { MissionControlNav } from "@/components/experience/MissionControlNav";
import { ProvenanceBadge } from "@/components/experience/ProvenanceBadge";
import { mcStatusClass } from "@/components/experience/mc-status";
import { RouteStatePanel } from "@/components/experience/RouteStatePanel";

export const metadata = {
  title: "Review — ForgeOS",
  description: "Review de decisiones, aprobaciones y riesgos (Query Layer V2)",
};

/** Review route — approvals / risks from read model. Not a second Mission Control. */
export default function ReviewPage() {
  const vm = loadMissionControlVM(null);

  if (vm.availability === "empty") {
    return (
      <div className="mc-root" style={{ padding: "clamp(12px, 3vw, 28px)" }}>
        <MissionControlNav missionId={vm.missionId} />
        <RouteStatePanel
          state={{
            kind: "empty",
            title: "Nada que revisar",
            description: vm.message ?? "Crea o selecciona una misión para ver decisiones y riesgos.",
            retryHref: "/mission-control",
          }}
        />
      </div>
    );
  }

  if (vm.availability === "error" || vm.availability === "unavailable") {
    return (
      <div className="mc-root" style={{ padding: "clamp(12px, 3vw, 28px)" }}>
        <MissionControlNav missionId={vm.missionId} />
        <RouteStatePanel
          state={{
            kind: vm.availability === "error" ? "error" : "unavailable",
            title: "Review no disponible",
            description: vm.message ?? vm.degradedReason ?? "No se pudo cargar el estado.",
            retryHref: "/review",
          }}
        />
      </div>
    );
  }

  return (
    <div className="mc-root" style={{ padding: "clamp(12px, 3vw, 28px)" }} data-testid="review-page">
      <MissionControlNav missionId={vm.missionId} />
      <header className="mc-header">
        <div>
          <p className="mc-header-kicker">Review</p>
          <h1 className="mc-header-title">Review</h1>
          <p className="mc-header-lede">
            Decisiones, aprobaciones y riesgos desde el read model — sin mutar store desde esta vista.
          </p>
          <div className="mc-header-actions">
            <Link href={vm.primaryCta.href} className="fhis-btn fhis-btn-primary">
              {vm.primaryCta.label}
            </Link>
            <Link href="/mission-control" className="fhis-btn fhis-btn-secondary">
              Mission Control
            </Link>
          </div>
        </div>
        <div className="mc-header-meta">
          <span className={mcStatusClass(vm.stage)}>
            <span className="mc-status-dot" aria-hidden />
            {vm.stage}
          </span>
          <ProvenanceBadge badge={vm.provenance} />
        </div>
      </header>

      <div className="mc-workspace" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="mc-card">
          <h2 className="mc-card-title">Approvals</h2>
          {vm.approvals.length === 0 ? (
            <p className="mc-card-empty">Sin aprobaciones pendientes.</p>
          ) : (
            <ul className="mc-list">
              {vm.approvals.map((a) => (
                <li key={a.id}>
                  {a.label}{" "}
                  <span className={mcStatusClass(a.status)} style={{ marginLeft: 6 }}>
                    <span className="mc-status-dot" aria-hidden />
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="mc-card">
          <h2 className="mc-card-title">Risks</h2>
          {vm.risks.length === 0 ? (
            <p className="mc-card-empty">Sin riesgos registrados.</p>
          ) : (
            <ul className="mc-list">
              {vm.risks.map((r) => (
                <li key={r.id}>
                  [{r.severity}] {r.label}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
