#!/usr/bin/env node
/**
 * PROGRAM 5370 — Verification script for Sandboxed Preview Runtime.
 * Run AFTER ForgeOS kill:ports → clean → build → reset:dev
 */
const path = require("path");
process.chdir(path.resolve(__dirname, ".."));

async function main() {
  const report = {
    program: "5370",
    startedAt: new Date().toISOString(),
    forgeOs: {},
    docker: null,
    sandboxes: [],
    e2e: null,
    routes: [
      "/studio/mc-nexora-field-e2e-5350/preview",
      "/lab/preview-runtime",
    ],
    verified: false,
  };

  console.log("\n▸ PROGRAM 5370 — Preview Runtime Verification\n");

  const { detectDocker, startSandbox, stopSandbox, cleanupSandbox, runNexoraPreviewE2E } =
    await import("../lib/preview-runtime/index.ts").catch(() =>
      require("../.next/server/chunks/0.js")
    );

  // Dynamic import for ts - use tsx or compiled - fallback to direct require path
  let rt;
  try {
    rt = await import("../lib/preview-runtime/index.js");
  } catch {
    // Register ts-node alternative: use child process with next
  }

  const { spawn } = require("child_process");
  const http = require("http");

  function fetchJson(url, opts = {}) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = http.request(
        { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: opts.method || "GET", headers: opts.headers || {} },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode, body: data }); }
          });
        }
      );
      req.on("error", reject);
      if (opts.body) req.write(opts.body);
      req.end();
    });
  }

  const host = process.env.PREVIEW_VERIFY_HOST || "http://127.0.0.1:3000";

  try {
    const dockerRes = await fetchJson(`${host}/api/preview-runtime/docker`);
    report.docker = dockerRes.body;
    console.log("Docker:", JSON.stringify(dockerRes.body));
  } catch (e) {
    report.docker = { error: e.message, note: "Start dev server first: npm run reset:dev" };
    console.log("Docker check skipped (dev server not running):", e.message);
  }

  try {
    const startRes = await fetchJson(`${host}/api/preview-runtime/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        missionId: "mc-nexora-field-e2e-5350",
        projectKind: "website",
      }),
    });
    if (startRes.status === 200) {
      const sb = startRes.body.sandbox;
      report.sandboxes.push({
        id: sb.id,
        status: sb.status,
        build: sb.build?.status,
        previewUrl: sb.previewUrl,
        isolation: sb.isolation,
      });
      console.log("Website sandbox:", sb.status, sb.build?.status);

      if (sb.id) {
        await fetchJson(`${host}/api/preview-runtime/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sb.id }),
        });
        await fetchJson(`${host}/api/preview-runtime/${sb.id}?full=true`, { method: "DELETE" });
      }
    } else {
      console.log("Start failed:", startRes.body);
    }
  } catch (e) {
    console.log("Sandbox start skipped:", e.message);
  }

  report.completedAt = new Date().toISOString();
  report.verified = Boolean(report.docker && report.sandboxes.length > 0);

  const outPath = path.join(__dirname, "..", "docs", "preview-runtime", "verification-report.json");
  require("fs").writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("\nReport:", outPath);
  console.log(report.verified ? "\n✓ Verification complete (see report)" : "\n⚠ Partial verification — start dev server for full E2E");
}

main().catch((e) => { console.error(e); process.exit(1); });
