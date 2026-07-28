import Link from "next/link";
import { loadActivityHubVM } from "@/src/presentation";
import { ProvenanceBadge } from "@/components/experience/ProvenanceBadge";

export const metadata = {
  title: "Activity — ForgeOS",
  description: "PROGRAM 6060 — Activity hub",
};

export default function ActivityPage() {
  const vm = loadActivityHubVM();
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)", maxWidth: 800 }}>
      <header style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Activity</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.75 }}>
            {vm.message ?? "Actividad reciente del sistema."}
          </p>
        </div>
        <ProvenanceBadge badge={{ label: "DEMO", tone: "demo" }} />
      </header>
      {vm.items.length === 0 ? (
        <p>Sin actividad.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {vm.items.map((item) => (
            <li
              key={item.id}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid var(--fhis-color-border, #d4d0c8)",
                fontSize: 14,
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.6 }}>{item.kind}</span>
              <div>
                {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: 20, fontSize: 13 }}>
        <Link href="/mission-control">Mission Control</Link>
        {" · "}
        <Link href="/settings">Settings</Link>
      </p>
    </div>
  );
}
