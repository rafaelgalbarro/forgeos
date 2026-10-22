// Captura de páginas de ForgeOS desde el propio servidor (localhost:3000).
// Uso: node page-shot.cjs /investment /tmp/out-prefix
const { chromium } = require("/opt/forgeos-shot/node_modules/playwright");
(async () => {
  const path = process.argv[2] || "/investment";
  const out = process.argv[3] || "/tmp/forgeos-shot";
  const browser = await chromium.launch();
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["movil", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const problems = [];
    page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 200)}`); });
    page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
    page.on("response", (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url().replace("http://localhost:3000", "")}`); });
    page.on("requestfailed", (r) => problems.push(`falló ${r.url().replace("http://localhost:3000", "")} ${r.failure()?.errorText ?? ""}`));
    try {
      await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle", timeout: 60000 });
    } catch (e) { problems.push(`goto: ${String(e).slice(0, 160)}`); }
    await page.waitForTimeout(5000);
    const sheets = await page.evaluate(() => [...document.styleSheets].map((s) => { try { return `${s.href || "inline"} reglas=${s.cssRules.length}`; } catch { return `${s.href} (sin acceso)`; } }));
    await page.screenshot({ path: `${out}-${name}.jpg`, fullPage: true, type: "jpeg", quality: 60 });
    console.log(`== ${name} ${viewport.width}x${viewport.height} título="${await page.title()}"`);
    console.log("hojas de estilo:", sheets.join(" | "));
    for (const p of [...new Set(problems)].slice(0, 25)) console.log("  ⚠", p);
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
