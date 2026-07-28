#!/usr/bin/env node
/**
 * PROGRAM 6085 — wait for ForgeOS readiness via real HTTP.
 * Usage: node scripts/wait-for-forgeos-ready.js [--base http://127.0.0.1:3000] [--timeout 120000]
 */
const args = process.argv.slice(2);
let base = process.env.FORGEOS_BASE_URL || "http://127.0.0.1:3000";
let timeoutMs = Number(process.env.FORGEOS_READY_TIMEOUT_MS || 120000);
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--base" && args[i + 1]) base = args[++i];
  if (args[i] === "--timeout" && args[i + 1]) timeoutMs = Number(args[++i]);
}

const endpoints = ["/api/health", "/api/ready", "/api/v2/health"];

async function probe(path) {
  const url = `${base.replace(/\/$/, "")}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return {
      path,
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      ms: Date.now() - started,
      bodyPreview: text.slice(0, 300),
      json,
    };
  } catch (err) {
    return {
      path,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let backoff = 500;
  const evidence = { base, attempts: [] };

  while (Date.now() < deadline) {
    attempt += 1;
    const results = [];
    for (const ep of endpoints) {
      // sequential probes — no Promise.all for pipeline honesty
      // eslint-disable-next-line no-await-in-loop
      results.push(await probe(ep));
    }
    evidence.attempts.push({ attempt, at: new Date().toISOString(), results });
    const allOk = results.every((r) => r.ok);
    if (allOk) {
      console.log(JSON.stringify({ ready: true, attempt, results }, null, 2));
      process.exit(0);
    }
    console.error(
      `wait-for-forgeos-ready: attempt ${attempt} not ready; backoff ${backoff}ms`,
    );
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, backoff));
    backoff = Math.min(backoff * 1.5, 5000);
  }

  console.error(JSON.stringify({ ready: false, timeoutMs, evidence }, null, 2));
  process.exit(1);
}

main();
