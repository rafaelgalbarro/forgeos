#!/usr/bin/env node
/**
 * PROGRAM 6085 — V2 smoke tests (HTTP + content checks; not status-only).
 * Avoid false positives from Next.js shared not-found strings in the JS flight payload.
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
let base = process.env.FORGEOS_BASE_URL || "http://127.0.0.1:3000";
let missionId = process.env.FORGEOS_SMOKE_MISSION_ID || "smoke-placeholder";
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--base" && args[i + 1]) base = args[++i];
  if (args[i] === "--mission" && args[i + 1]) missionId = args[++i];
}

/** @type {Array<{ path: string, expectAny?: string[], api?: boolean }>} */
const routes = [
  { path: "/", expectAny: ["ForgeOS", "Dashboard", "Mission"] },
  { path: "/mission-control", expectAny: ["Mission Control", "mission-control"] },
  { path: `/missions/${missionId}`, expectAny: ["Mission", "mission", "Studio", "studio"] },
  { path: `/studio/${missionId}`, expectAny: ["Studio", "studio", "Mission"] },
  { path: `/studio/${missionId}/code`, expectAny: ["code", "Code", "Studio"] },
  { path: `/studio/${missionId}/preview`, expectAny: ["preview", "Preview", "Studio"] },
  { path: "/deployments", expectAny: ["Deploy", "deploy"] },
  { path: "/lab/v2-architecture", expectAny: ["V2 Architecture", "Composition root"] },
  { path: "/lab/v2-workflows", expectAny: ["V2 Workflows", "workflow"] },
  { path: "/lab/v2-graph", expectAny: ["V2 Graph", "lineage"] },
  { path: "/lab/v2-capabilities", expectAny: ["V2 Capabilities", "capability"] },
  { path: "/lab/v2-migration", expectAny: ["V2 Migration", "ENABLE_V2"] },
  { path: "/api/health", api: true, expectAny: ['"alive":true', '"status":"ok"'] },
  { path: "/api/ready", api: true, expectAny: ['"ready":true'] },
  { path: "/api/v2/health", api: true, expectAny: ['"healthy":true', "commandHandlersRegistered"] },
];

const HARD_ERROR_MARKERS = [
  "Application error: a client-side exception",
  "Internal Server Error",
  "Unhandled Runtime Error",
  "Server Error",
];

async function checkRoute(route) {
  const url = `${base.replace(/\/$/, "")}${route.path}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/html,application/json" },
      redirect: "manual",
    });
    const text = await res.text();
    const status = res.status;
    const redirectOk = status >= 300 && status < 400;
    let ok = route.api ? status === 200 : status === 200 || redirectOk;

    if (status === 404) {
      return {
        path: route.path,
        status,
        ok: false,
        blocked: true,
        detail: "HTTP 404 — route missing",
      };
    }

    const hard = HARD_ERROR_MARKERS.filter((m) => text.includes(m));
    if (hard.length) ok = false;

    // Precise soft-404 in RSC: status 404 message without positive content
    const soft404 =
      text.includes('"status":404') &&
      text.includes("This page could not be found") &&
      !(route.expectAny || []).some((e) => text.includes(e));
    if (soft404) ok = false;

    const missingExpect = (route.expectAny || []).length
      ? !(route.expectAny || []).some((e) => text.includes(e))
      : false;
    if (missingExpect && status === 200) ok = false;

    return {
      path: route.path,
      status,
      ok,
      hard,
      missingExpect,
      soft404,
      detail: ok
        ? "ok"
        : `HTTP ${status}; hard=${hard.join("|") || "none"}; missingExpect=${missingExpect}; soft404=${soft404}`,
      bodySnippet: text.slice(0, 160).replace(/\s+/g, " "),
    };
  } catch (err) {
    return {
      path: route.path,
      status: 0,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const results = [];
  for (const route of routes) {
    // sequential
    // eslint-disable-next-line no-await-in-loop
    results.push(await checkRoute(route));
  }
  const failed = results.filter((r) => !r.ok && !r.blocked);
  const blocked = results.filter((r) => r.blocked);
  const summary = {
    program: "6085",
    base,
    missionId,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    blocked: blocked.length,
    results,
    ranAt: new Date().toISOString(),
  };
  const outDir = path.join(__dirname, "..", "artifacts", "v2-certification");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "smoke.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) process.exit(1);
  if (blocked.length > 0) process.exit(2);
  process.exit(0);
}

main();
