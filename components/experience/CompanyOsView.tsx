"use client";

import Link from "next/link";
import { ProvenanceBadge } from "./ProvenanceBadge";
import type { CompanyOsVM } from "@/src/presentation/view-models/types";

export function CompanyOsView({ vm }: { vm: CompanyOsVM }) {
  return (
    <div style={{ maxWidth: 1100 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>COMPANY OS</p>
          <h1 style={{ margin: "4px 0 0", fontSize: "clamp(1.25rem, 3vw, 1.7rem)" }}>{vm.name}</h1>
          <p style={{ margin: "8px 0 0", maxWidth: 640, fontSize: 14 }}>{vm.executiveSummary}</p>
        </div>
        <ProvenanceBadge badge={vm.provenance} />
      </header>

      <Section title="Products">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {vm.products.map((p) => (
            <li key={p.id}>
              {p.name} · {p.status}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Customers">
        <ul style={{ margin: 0, paddingLeft: 18, listStyle: "none" }}>
          {vm.customers.map((c) => (
            <li key={c.id} style={{ marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
              <ProvenanceBadge badge={c.badge} />
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <Section title="Growth">
          {vm.growth.map((g) => (
            <div key={g.metric} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <ProvenanceBadge badge={g.badge} />
              <span style={{ fontSize: 13 }}>
                {g.metric}: {g.value}
              </span>
            </div>
          ))}
        </Section>
        <Section title="Finance">
          {vm.finance.map((f) => (
            <div key={f.metric} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <ProvenanceBadge badge={f.badge} />
              <span style={{ fontSize: 13 }}>
                {f.metric}: {f.value}
              </span>
            </div>
          ))}
        </Section>
      </div>

      <Section title="Operations">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {vm.operations.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </Section>

      <Section title="Risks">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {vm.risks.map((r) => (
            <li key={r.id}>
              [{r.severity}] {r.label}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Roadmap">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {vm.roadmap.map((r) => (
            <li key={r.id}>
              {r.label} · {r.when}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Active missions">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {vm.activeMissions.map((m) => (
            <li key={m.id}>
              <Link href={m.href}>{m.title}</Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Deployments">
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
          {vm.deployments.map((d) => (
            <li key={d.id} style={{ marginBottom: 6, display: "flex", gap: 8, alignItems: "center" }}>
              <ProvenanceBadge badge={d.badge} />
              <span style={{ fontSize: 13 }}>
                {d.label} · {d.environment}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <p style={{ fontSize: 13, marginTop: 8 }}>
        <Link href={`/ventures/${vm.ventureId}`}>Venture E2E →</Link>
        {" · "}
        <Link href="/mission-control">Mission Control</Link>
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginBottom: 16,
        padding: 16,
        borderRadius: 10,
        border: "1px solid var(--fhis-color-border, #d4d0c8)",
      }}
    >
      <h2 style={{ margin: "0 0 10px", fontSize: 14 }}>{title}</h2>
      {children}
    </section>
  );
}
