#!/usr/bin/env node
/**
 * Check whether forgeos.trade appears verified in Resend domains.
 * Usage: node scripts/check-resend-domain.js
 * Reads RESEND_API_KEY from env / .env.local (does not print the key).
 */
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) {
    console.log("status=missing_key");
    process.exit(1);
  }
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => ({}));
  const domains = Array.isArray(body.data) ? body.data : [];
  const hit = domains.find((d) =>
    String(d.name || "")
      .toLowerCase()
      .endsWith("forgeos.trade"),
  );
  console.log(`http=${res.status}`);
  console.log(
    `domains=${domains.map((d) => `${d.name}:${d.status}`).join(",") || "(none)"}`,
  );
  console.log(`forgeos.trade=${hit ? hit.status : "NOT_LISTED"}`);
  process.exit(hit && String(hit.status).toLowerCase() === "verified" ? 0 : 2);
}

main().catch((err) => {
  console.log(`error=${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
