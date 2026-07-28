import { PERFORMANCE_BUDGETS } from "@/src/core/performance/config/budgets";
import { readModelCacheStats } from "@/src/core/performance/cache/read-model-cache";
import { getActiveExecutionCount } from "@/src/core/performance/concurrency/concurrency-guard";
import { getQueueSnapshot } from "@/src/core/performance/queue/load-planner";
import { getActivePreviewCount } from "@/src/core/performance/preview/lifecycle";
import { getAllTelemetry } from "@/src/core/performance/observability/telemetry";
import { getServiceRegistry } from "@/src/core/performance/composition/lazy-services";
import { measureCompositionRootInit } from "@/src/core/performance/composition/measure-init";
import { COMPONENT_INVENTORY } from "@/src/core/performance/rendering/component-inventory";

export const metadata = {
  title: "V2 Performance — PROGRAM 6100",
  description: "Internal performance observability dashboard",
};

export default function V2PerformanceLabPage() {
  const init = measureCompositionRootInit();
  const cache = readModelCacheStats();
  const queue = getQueueSnapshot();
  const services = getServiceRegistry();
  const telemetry = getAllTelemetry();

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1200 }}>
      <h1>PROGRAM 6100 — V2 Performance</h1>
      <p>Internal observability: routes, queries, queue, concurrency, previews, cache, venture isolation.</p>

      <section style={{ marginTop: 32 }}>
        <h2>Budgets</h2>
        <pre style={{ background: "#111", color: "#0f0", padding: 16, borderRadius: 8, overflow: "auto" }}>
          {JSON.stringify(PERFORMANCE_BUDGETS, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Composition Root</h2>
        <ul>
          <li>Cold init: {init.coldInitMs.toFixed(2)}ms</li>
          <li>Warm init: {init.warmInitMs.toFixed(2)}ms</li>
          <li>Services: {init.serviceCount}</li>
          <li>Core services: {services.filter((s) => s.tier === "core").length}</li>
          <li>Lazy services: {services.filter((s) => s.tier === "lazy").length}</li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Cache</h2>
        <ul>
          <li>Read model entries: {cache.entries}</li>
          <li>Stale entries: {cache.stale}</li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Queue &amp; Concurrency</h2>
        <ul>
          <li>Pending tasks: {queue.pending}</li>
          <li>Running tasks: {queue.running}</li>
          <li>Active executions: {getActiveExecutionCount()}</li>
          <li>Active previews: {getActivePreviewCount()}</li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Component Inventory ({COMPONENT_INVENTORY.length})</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Component</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Mode</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Cost</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 8 }}>Optimization</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENT_INVENTORY.map((c) => (
              <tr key={c.component}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.component}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.renderMode}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.bundleCost}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.optimization}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {telemetry.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Venture Telemetry</h2>
          <pre style={{ background: "#111", color: "#0f0", padding: 16, borderRadius: 8, overflow: "auto" }}>
            {JSON.stringify(telemetry, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
