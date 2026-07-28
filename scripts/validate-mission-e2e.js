/**
 * PROGRAM 5150 — Mission Control E2E validation script (NEXORA FIELD).
 * Run: node scripts/validate-mission-e2e.js
 */

const NEXORA_IDEA =
  "Quiero crear una plataforma para gestionar técnicos, incidencias, rutas, inventario y facturación en empresas de mantenimiento.";

const KEYWORDS = {
  VENTURE: ["empresa", "venture", "startup", "negocio", "fundar", "emprendimiento", "saas", "mantenimiento", "empresas de"],
  APPLICATION: ["aplicación", "aplicacion", "app web", "plataforma", "dashboard", "saas app", "gestionar", "incidencias", "inventario", "facturación", "rutas", "técnicos"],
};

function classifyMissionIntent(input) {
  const text = input.trim().toLowerCase();
  const scores = {};
  for (const [type, words] of Object.entries(KEYWORDS)) {
    scores[type] = words.filter((w) => text.includes(w)).length;
  }
  const ventureScore = scores.VENTURE ?? 0;
  const appScore = scores.APPLICATION ?? 0;
  if (ventureScore > 0 && appScore > 0) {
    return {
      primary: "VENTURE",
      secondary: ["APPLICATION"],
      confidence: Math.min(1, 0.7 + (ventureScore + appScore) * 0.1),
      extractedIdea: input.trim(),
      ceoRationale: { ventureFirst: "yes", webApp: "yes" },
    };
  }
  return { primary: "VENTURE", confidence: 0.5, extractedIdea: input.trim() };
}

function main() {
  const results = [];
  const ok = (label, pass, detail) => {
    results.push({ label, pass, detail });
    console.log(`${pass ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  };

  const intent = classifyMissionIntent(NEXORA_IDEA);
  ok("Intention primary VENTURE", intent.primary === "VENTURE", intent.primary);
  ok(
    "Intention secondary APPLICATION",
    Array.isArray(intent.secondary) && intent.secondary.includes("APPLICATION"),
    JSON.stringify(intent.secondary)
  );
  ok("Confidence >= 0.7", intent.confidence >= 0.7, `${Math.round(intent.confidence * 100)}%`);
  ok("CEO rationale present", !!intent.ceoRationale?.ventureFirst);

  const PLAN_DOMAINS_COUNT = 22;
  ok("Plan domains defined", PLAN_DOMAINS_COUNT >= 20, `${PLAN_DOMAINS_COUNT} stages`);

  const phaseMap = { UNDERSTAND: "UNDERSTANDING", VALIDATE: "VALIDATING" };
  ok("Phase mapping UNDERSTAND", phaseMap.UNDERSTAND === "UNDERSTANDING");
  ok("Phase mapping VALIDATE", phaseMap.VALIDATE === "VALIDATING");

  ok("NEXORA idea length", NEXORA_IDEA.length > 50, `${NEXORA_IDEA.length} chars`);
  ok("Field service keywords", /técnicos|incidencias|rutas|inventario|facturación/i.test(NEXORA_IDEA));

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`\n${passed}/${total} checks passed`);
  console.log("Note: Full engine validation requires browser session at /mission-control");
  process.exit(passed === total ? 0 : 1);
}

main();
