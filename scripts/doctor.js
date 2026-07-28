#!/usr/bin/env node
/**
 * ForgeOS environment doctor — diagnostics for chunk/cache issues.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const {
  ROOT,
  log,
  logStep,
  fileExists,
  isPortInUse,
  hasProductionBuildCache,
  readPackageJson,
  getInstalledNextVersion,
  getPidsOnPort,
  isWindows,
} = require("./_utils");

const CRITICAL_FILES = [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "app/layout.tsx",
  "app/globals.css",
  "app/dashboard/page.tsx",
  "components/dashboard/DashboardView.tsx",
  "lib/portfolio/index.ts",
  "lib/portfolio/next-action.ts",
  "lib/export/index.ts",
];

const CRITICAL_ROUTES = [
  "/",
  "/dashboard",
  "/projects",
  "/intelligence/[id]",
  "/build/[id]",
  "/venture/[id]",
];

let issues = 0;
let warnings = 0;

function ok(msg) {
  log(`  ✓ ${msg}`);
}

function warn(msg) {
  warnings += 1;
  log(`  ⚠ ${msg}`);
}

function fail(msg) {
  issues += 1;
  log(`  ✗ ${msg}`);
}

function section(title) {
  logStep(title);
}

section("Runtime");
ok(`Node ${process.version}`);
try {
  const npmVer = execSync("npm --version", { encoding: "utf8" }).trim();
  ok(`npm ${npmVer}`);
} catch {
  fail("npm no disponible");
}
ok(`Plataforma: ${process.platform}${isWindows() ? " (Windows)" : ""}`);
ok(`Directorio: ${ROOT}`);

section("Proyecto");
if (fileExists("package.json")) {
  const pkg = readPackageJson();
  ok(`package.json — ${pkg.name}@${pkg.version}`);
} else {
  fail("package.json no encontrado");
}

const nextVer = getInstalledNextVersion();
ok(`Next.js instalado: ${nextVer}`);

for (const file of CRITICAL_FILES) {
  if (fileExists(file)) {
    ok(file);
  } else {
    fail(`Falta: ${file}`);
  }
}

section("Caché .next");
if (fileExists(".next")) {
  if (hasProductionBuildCache()) {
    warn(
      ".next contiene build de producción — NO uses `npm run dev` sin `npm run reset:dev` antes"
    );
  } else {
    ok(".next presente (dev parcial o compilación en curso)");
  }

  const chunkCount = countFiles(".next", ".js");
  log(`  · ~${chunkCount} archivos .js en .next`);
} else {
  ok(".next ausente (normal antes del primer dev/build)");
}

section("Puertos");
for (const port of [3000, 3001]) {
  if (isPortInUse(port)) {
    const pids = getPidsOnPort(port);
    warn(`Puerto ${port} OCUPADO — PID: ${pids.join(", ")} (causa habitual de chunks corruptos)`);
  } else {
    ok(`Puerto ${port} libre`);
  }
}

section("Rutas App Router");
for (const route of CRITICAL_ROUTES) {
  const filePath = routeToFile(route);
  if (fileExists(filePath)) {
    ok(`${route} → ${filePath}`);
  } else {
    warn(`Ruta ${route} — archivo no verificado (${filePath})`);
  }
}

section("Módulos críticos (estructura)");
const barrelChecks = [
  { file: "lib/portfolio/index.ts", exports: ["buildPortfolioDashboardData", "resolveNextAction"] },
  { file: "lib/export/index.ts", exports: ["downloadVentureExport", "downloadVentureZip"] },
  { file: "lib/dashboard/index.ts", exports: ["buildDashboardData"] },
];

for (const { file, exports: expected } of barrelChecks) {
  if (!fileExists(file)) continue;
  const content = fs.readFileSync(path.join(ROOT, file), "utf8");
  const missing = expected.filter((name) => !content.includes(name));
  if (missing.length === 0) {
    ok(`${file} exporta: ${expected.join(", ")}`);
  } else {
    warn(`${file} — faltan referencias a: ${missing.join(", ")}`);
  }
}

section("Imports circulares (heurística)");
const circularRisk = checkCircularRisk();
if (circularRisk.length === 0) {
  ok("No se detectaron cadenas dashboard → export → portfolio sospechosas");
} else {
  for (const msg of circularRisk) {
    warn(msg);
  }
}

section("Diagnóstico del error ./331.js");
log("  Causa más probable en este proyecto:");
log("  · Múltiples instancias de next dev en 3000/3001");
log("  · Mezclar `npm run build` + `npm run dev` sin limpiar .next");
log("  · Hot reload tras cambios grandes (globals.css) con servidor zombie");
log("  · Referencia a pages/_document.js es artefacto interno de Next, no un bug de Pages Router");

log("\n══════════════════════════════════════════");
if (issues > 0) {
  log(`  RESULTADO: ${issues} error(es), ${warnings} advertencia(s)`);
  log("  Ejecuta: npm run reset:dev");
} else if (warnings > 0) {
  log(`  RESULTADO: OK con ${warnings} advertencia(s)`);
  log("  Recomendado: npm run reset:dev");
} else {
  log("  RESULTADO: OK");
}
log("══════════════════════════════════════════\n");

process.exit(issues > 0 ? 1 : 0);

function routeToFile(route) {
  if (route === "/") return "app/page.tsx";
  const segments = route.replace(/^\//, "").split("/");
  const parts = segments.map((s) => (s.startsWith("[") ? s : s));
  return `app/${parts.join("/")}/page.tsx`;
}

function countFiles(dir, ext, total = 0) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return 0;
  let count = total;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count = countFiles(rel, ext, count);
    } else if (entry.name.endsWith(ext)) {
      count += 1;
    }
  }
  return count;
}

function checkCircularRisk() {
  const risks = [];
  const dashboardImportsExport = fileExists("components/dashboard/DashboardView.tsx")
    ? fs.readFileSync(path.join(ROOT, "components/dashboard/DashboardView.tsx"), "utf8")
    : "";
  if (dashboardImportsExport.includes("@/lib/export")) {
    risks.push("DashboardView importa @/lib/export — riesgo de bundle pesado en /dashboard");
  }
  const portfolioIndex = fileExists("lib/portfolio/index.ts")
    ? fs.readFileSync(path.join(ROOT, "lib/portfolio/index.ts"), "utf8")
    : "";
  if (portfolioIndex.includes("@/lib/export")) {
    risks.push("lib/portfolio importa @/lib/export — posible circular");
  }
  return risks;
}
